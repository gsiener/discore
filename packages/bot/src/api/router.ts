/**
 * API Router for Scorebot
 * Thin HTTP adapter: parse request → call GameStore → serialize response.
 * All DO/D1 coordination lives in GameStore; the Router does no store save
 * calls, holds no DO stubs, and contains no hydration logic.
 */

import { Env } from '../types';
import { DatabaseService } from '../db/database';
import { GameStore } from '../store/GameStore';
import { GameStateError } from '../durable-objects/GameState';
import { GetAdvancedStatsResponse, GetAggregatedStatsResponse } from '@scorebot/shared';
import { StatsCalculator } from '../services/StatsCalculator';
import { CreateGameRequestSchema, AddEventRequestSchema, SetLineupsRequestSchema } from './validation';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: JSON_HEADERS }
  );
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export class Router {
  private db: DatabaseService;
  private store: GameStore;
  private statsCalculator: StatsCalculator;

  constructor(private env: Env) {
    this.db = new DatabaseService(env.DB);
    this.store = new GameStore(env.GAME_STATE, this.db);
    this.statsCalculator = new StatsCalculator();
  }

  /**
   * Extract game ID from URL path
   */
  private getGameIdFromPath(path: string): string {
    return path.split('/')[2];
  }

  /**
   * Add CORS headers to a response
   */
  private addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const allowedOrigins = ['https://score.kcuda.org', 'http://localhost:3000'];
    const requestOrigin = request.headers.get('Origin') || '';
    const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      // Health check
      if (path === '/health') {
        response = jsonResponse({ status: 'ok', timestamp: Date.now() });
      }
      // Create new game
      else if (path === '/games' && request.method === 'POST') {
        response = await this.createGame(request);
      }
      // List games
      else if (path === '/games' && request.method === 'GET') {
        response = await this.listGames(request);
      }
      // Get specific game (only match /games/{id}, not /games/{id}/stats etc.)
      else if (path.match(/^\/games\/[^/]+$/) && request.method === 'GET') {
        const gameId = this.getGameIdFromPath(path);
        response = await this.getGame(gameId);
      }
      // Update game (PATCH)
      else if (path.match(/^\/games\/[^/]+$/) && request.method === 'PATCH') {
        const gameId = this.getGameIdFromPath(path);
        response = await this.updateGame(gameId, request);
      }
      // Delete game
      else if (path.match(/^\/games\/[^/]+$/) && request.method === 'DELETE') {
        const gameId = this.getGameIdFromPath(path);
        response = await this.deleteGame(gameId);
      }
      // Add event to game
      else if (
        path.match(/^\/games\/[^/]+\/events$/) &&
        request.method === 'POST'
      ) {
        const gameId = this.getGameIdFromPath(path);
        response = await this.addEvent(gameId, request);
      }
      // Set lineups for a game
      else if (
        path.match(/^\/games\/[^/]+\/lineups$/) &&
        request.method === 'PUT'
      ) {
        const gameId = this.getGameIdFromPath(path);
        response = await this.setLineups(gameId, request);
      }
      // Delete specific event by ID
      else if (
        path.match(/^\/games\/[^/]+\/events\/[^/]+$/) &&
        request.method === 'DELETE'
      ) {
        const gameId = this.getGameIdFromPath(path);
        const eventId = path.split('/')[4];
        response = await this.deleteEvent(gameId, eventId);
      }
      // Undo last event
      else if (
        path.match(/^\/games\/[^/]+\/undo$/) &&
        request.method === 'POST'
      ) {
        const gameId = this.getGameIdFromPath(path);
        response = await this.undoLastEvent(gameId);
      }
      // Get advanced stats for a game
      else if (
        path.match(/^\/games\/[^/]+\/stats$/) &&
        request.method === 'GET'
      ) {
        const gameId = this.getGameIdFromPath(path);
        response = await this.getGameStats(gameId);
      }
      // Get aggregated stats across games
      else if (path === '/stats/aggregated' && request.method === 'GET') {
        response = await this.getAggregatedStats(request);
      }
      // Process WhatsApp message
      else if (path === '/whatsapp/message' && request.method === 'POST') {
        response = await this.processWhatsAppMessage(request);
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      return this.addCorsHeaders(response, corsHeaders);
    } catch (error) {
      // Domain failures carry their intended HTTP status.
      if (error instanceof GameStateError) {
        return this.addCorsHeaders(jsonError(error.message, error.status), corsHeaders);
      }

      console.error('Router error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  }

  private async createGame(request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = CreateGameRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation error', 400);
    }

    const game = await this.store.createGame(parsed.data);
    return jsonResponse({ game });
  }

  private async getGame(gameId: string): Promise<Response> {
    const game = await this.store.getGame(gameId);
    if (!game) {
      return jsonError('Game not found', 404);
    }

    return jsonResponse({ game });
  }

  private async listGames(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const games = await this.store.listGames(limit);

    return jsonResponse({ games });
  }

  private async addEvent(gameId: string, request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = AddEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation error', 400);
    }

    const result = await this.store.addEvent(gameId, parsed.data);
    return jsonResponse(result);
  }

  private async undoLastEvent(gameId: string): Promise<Response> {
    const result = await this.store.undoLastEvent(gameId);
    return jsonResponse(result);
  }

  private async deleteEvent(gameId: string, eventId: string): Promise<Response> {
    const result = await this.store.deleteEvent(gameId, eventId);
    return jsonResponse(result);
  }

  private async setLineups(gameId: string, request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = SetLineupsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation error', 400);
    }

    const game = await this.store.setLineups(gameId, parsed.data);
    return jsonResponse({ game });
  }

  private async updateGame(gameId: string, request: Request): Promise<Response> {
    const updates = await request.json() as {
      startingOnOffense?: boolean;
      videoUrl?: string;
      ourTeamName?: string;
      opponentName?: string;
      tournamentName?: string;
    };

    const game = await this.store.updateGame(gameId, updates);
    return jsonResponse({ game });
  }

  private async deleteGame(gameId: string): Promise<Response> {
    const deleted = await this.store.deleteGame(gameId);
    if (!deleted) {
      return jsonError('Game not found', 404);
    }

    return jsonResponse({ success: true, deleted: gameId });
  }

  private async processWhatsAppMessage(request: Request): Promise<Response> {
    return jsonResponse({ message: 'WhatsApp integration coming soon' });
  }

  private async getGameStats(gameId: string): Promise<Response> {
    const game = await this.db.getGame(gameId);
    if (!game) {
      return jsonError('Game not found', 404);
    }

    const stats = this.statsCalculator.calculateGameStats(game);
    const response: GetAdvancedStatsResponse = { stats };

    return jsonResponse(response);
  }

  private async getAggregatedStats(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const tournamentName = url.searchParams.get('tournament') || undefined;
    const fromDate = url.searchParams.get('from') || undefined;
    const toDate = url.searchParams.get('to') || undefined;

    // Single query with JOIN instead of N+1
    const games = await this.db.listGamesWithEvents(limit, tournamentName, fromDate, toDate);

    // Calculate aggregated stats
    const players = this.statsCalculator.aggregatePlayerStats(games);
    const teamTrends = games.length > 0 ? this.statsCalculator.calculateTeamTrends(games) : undefined;
    const playerChemistry = games.length > 0 ? this.statsCalculator.calculatePlayerChemistry(games) : undefined;

    // Determine date range
    let dateRange: { from: string; to: string } | undefined;
    if (games.length > 0) {
      const dates = games
        .filter(g => g.gameDate)
        .map(g => g.gameDate!)
        .sort();

      if (dates.length > 0) {
        dateRange = {
          from: dates[0],
          to: dates[dates.length - 1],
        };
      }
    }

    const response: GetAggregatedStatsResponse = {
      players,
      totalGames: games.length,
      dateRange,
      teamTrends,
      playerChemistry,
    };

    return jsonResponse(response);
  }
}
