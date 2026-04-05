/**
 * API Router for Scorebot
 * Handles HTTP requests and routes them to appropriate handlers
 */

import { Env } from '../types';
import { DatabaseService } from '../db/database';
import { GameState } from '../durable-objects/GameState';
import { CreateGameRequest, CreateGameResponse, AddEventRequest, AddEventResponse, GetAdvancedStatsResponse, GetAggregatedStatsResponse, Game } from '@scorebot/shared';
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
  private statsCalculator: StatsCalculator;

  constructor(private env: Env) {
    this.db = new DatabaseService(env.DB);
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

  /**
   * Ensure a Durable Object has game state, rehydrating from D1 if needed.
   * Returns the DO stub ready for use, or null if rehydration failed.
   */
  private async ensureDOHydrated(
    chatId: string,
    gameForRehydration?: Game
  ): Promise<DurableObjectStub | null> {
    const id = this.env.GAME_STATE.idFromName(chatId);
    const stub = this.env.GAME_STATE.get(id);

    // Check if DO already has state
    const checkResponse = await stub.fetch('https://fake-host/');
    if (checkResponse.status !== 404) {
      return stub;
    }

    // DO was evicted — need full game data to rehydrate
    const game = gameForRehydration || await this.db.getGame(chatId);
    if (!game) return null;

    const rehydrateResponse = await stub.fetch(
      new Request('https://fake-host/rehydrate', {
        method: 'POST',
        body: JSON.stringify(game),
      })
    );

    if (rehydrateResponse.ok) {
      return stub;
    }

    return null;
  }

  /**
   * Forward a mutation to a game's Durable Object and persist the result.
   * Handles: lookup game → hydrate DO → forward request → save to DB.
   */
  private async mutateGameViaDO(
    gameId: string,
    doPath: string,
    doMethod: string,
    body?: unknown,
    saveStrategy: 'metadata' | 'events' = 'events',
  ): Promise<Response> {
    // Only need metadata (chatId) for routing — avoid fetching all events
    const game = await this.db.getGameMetadata(gameId);
    if (!game || !game.chatId) {
      return jsonError('Game not found', 404);
    }

    const stub = await this.ensureDOHydrated(game.chatId);
    if (!stub) {
      return jsonError('Failed to restore game state', 500);
    }

    const response = await stub.fetch(
      new Request(`https://fake-host${doPath}`, {
        method: doMethod,
        ...(body !== undefined && { body: JSON.stringify(body) }),
      })
    );

    const data = await response.json() as { game: Game };

    if (response.ok) {
      if (saveStrategy === 'metadata') {
        await this.db.saveGameMetadata(data.game);
      } else {
        await this.db.saveGameWithEvents(data.game);
      }
    }

    return jsonResponse(data, response.status);
  }

  private async createGame(request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = CreateGameRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation error', 400);
    }
    const { chatId, ourTeamName, opponentName, tournamentName, gameDate, gameOrder } = parsed.data;

    // Get or create Durable Object for this game
    const id = this.env.GAME_STATE.idFromName(chatId);
    const stub = this.env.GAME_STATE.get(id);

    // Initialize game in Durable Object
    const response = await stub.fetch(
      new Request('https://fake-host/init', {
        method: 'POST',
        body: JSON.stringify({ chatId, ourTeamName, opponentName, tournamentName, gameDate, gameOrder }),
      })
    );

    const data = await response.json() as CreateGameResponse;

    // Save to database (full save for new game)
    await this.db.saveGame(data.game);

    return jsonResponse(data);
  }

  private async getGame(gameId: string): Promise<Response> {
    const game = await this.db.getGame(gameId);
    if (!game) {
      return jsonError('Game not found', 404);
    }

    // Try to get fresh state from Durable Object if chatId exists
    if (game.chatId) {
      try {
        const stub = await this.ensureDOHydrated(game.chatId, game);
        if (stub) {
          return await stub.fetch('https://fake-host/');
        }
      } catch {
        // Fall back to database version
      }
    }

    return jsonResponse({ game });
  }

  private async listGames(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const games = await this.db.listGames(limit);

    return jsonResponse({ games });
  }

  private async addEvent(gameId: string, request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = AddEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation error', 400);
    }

    return this.mutateGameViaDO(gameId, '/events', 'POST', parsed.data, 'events');
  }

  private async undoLastEvent(gameId: string): Promise<Response> {
    return this.mutateGameViaDO(gameId, '/events/last', 'DELETE', undefined, 'events');
  }

  private async deleteEvent(gameId: string, eventId: string): Promise<Response> {
    return this.mutateGameViaDO(gameId, `/events/${eventId}`, 'DELETE', undefined, 'events');
  }

  private async setLineups(gameId: string, request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = SetLineupsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation error', 400);
    }

    return this.mutateGameViaDO(gameId, '/lineups', 'PATCH', parsed.data, 'metadata');
  }

  private async updateGame(
    gameId: string,
    request: Request
  ): Promise<Response> {
    const updates = await request.json() as { startingOnOffense?: boolean; videoUrl?: string; ourTeamName?: string; opponentName?: string; tournamentName?: string };

    const game = await this.db.getGameMetadata(gameId);
    if (!game) {
      return jsonError('Game not found', 404);
    }

    // Update fields
    if (updates.startingOnOffense !== undefined) {
      game.startingOnOffense = updates.startingOnOffense;
    }
    if (updates.videoUrl !== undefined) {
      game.videoUrl = updates.videoUrl;
    }
    if (updates.ourTeamName !== undefined) {
      game.teams.us.name = updates.ourTeamName;
    }
    if (updates.opponentName !== undefined) {
      game.teams.them.name = updates.opponentName;
    }
    if (updates.tournamentName !== undefined) {
      game.tournamentName = updates.tournamentName;
    }

    game.updatedAt = Date.now();

    // Update in database (metadata only)
    await this.db.saveGameMetadata(game);

    // If game has a chatId, also update the Durable Object
    if (game.chatId) {
      try {
        const stub = await this.ensureDOHydrated(game.chatId);
        if (stub) {
          await stub.fetch(
            new Request('https://fake-host/update', {
              method: 'PATCH',
              body: JSON.stringify(updates),
            })
          );
        }
      } catch (error) {
        console.warn('Failed to update Durable Object:', error);
      }
    }

    return jsonResponse({ game });
  }

  private async deleteGame(gameId: string): Promise<Response> {
    const game = await this.db.getGameMetadata(gameId);
    if (!game) {
      return jsonError('Game not found', 404);
    }

    await this.db.deleteGame(gameId);

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
