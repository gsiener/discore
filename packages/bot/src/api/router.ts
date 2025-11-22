/**
 * API Router for Scorebot
 * Handles HTTP requests and routes them to appropriate handlers
 */

import { Env } from '../types';
import { DatabaseService } from '../db/database';
import { GameState } from '../durable-objects/GameState';

export class Router {
  private db: DatabaseService;

  constructor(private env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
        response = new Response(
          JSON.stringify({ status: 'ok', timestamp: Date.now() }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Create new game
      else if (path === '/games' && request.method === 'POST') {
        response = await this.createGame(request);
      }
      // List games
      else if (path === '/games' && request.method === 'GET') {
        response = await this.listGames(request);
      }
      // Get specific game
      else if (path.startsWith('/games/') && request.method === 'GET') {
        const gameId = path.split('/')[2];
        response = await this.getGame(gameId);
      }
      // Add event to game
      else if (
        path.match(/^\/games\/[^/]+\/events$/) &&
        request.method === 'POST'
      ) {
        const gameId = path.split('/')[2];
        response = await this.addEvent(gameId, request);
      }
      // Undo last event
      else if (
        path.match(/^\/games\/[^/]+\/undo$/) &&
        request.method === 'POST'
      ) {
        const gameId = path.split('/')[2];
        response = await this.undoLastEvent(gameId);
      }
      // Process WhatsApp message
      else if (path === '/whatsapp/message' && request.method === 'POST') {
        response = await this.processWhatsAppMessage(request);
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
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

  private async createGame(request: Request): Promise<Response> {
    const { chatId, ourTeamName, opponentName } = await request.json();

    // Get or create Durable Object for this game
    const id = this.env.GAME_STATE.idFromName(chatId);
    const stub = this.env.GAME_STATE.get(id);

    // Initialize game in Durable Object
    const response = await stub.fetch(
      new Request('https://fake-host/init', {
        method: 'POST',
        body: JSON.stringify({ chatId, ourTeamName, opponentName }),
      })
    );

    const data = await response.json();

    // Save to database
    await this.db.saveGame(data.game);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getGame(gameId: string): Promise<Response> {
    // Get game from database to find chatId
    const game = await this.db.getGame(gameId);
    if (!game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Try to get fresh state from Durable Object if chatId exists
    if (game.chatId) {
      try {
        const id = this.env.GAME_STATE.idFromName(game.chatId);
        const stub = this.env.GAME_STATE.get(id);
        return await stub.fetch('https://fake-host/');
      } catch {
        // Fall back to database version
      }
    }

    return new Response(JSON.stringify({ game }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async listGames(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const games = await this.db.listGames(limit);

    return new Response(JSON.stringify({ games }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async addEvent(
    gameId: string,
    request: Request
  ): Promise<Response> {
    const eventData = await request.json();

    // Get game from database to find chatId
    const game = await this.db.getGame(gameId);
    if (!game || !game.chatId) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add event via Durable Object (keyed by chatId)
    const id = this.env.GAME_STATE.idFromName(game.chatId);
    const stub = this.env.GAME_STATE.get(id);

    const response = await stub.fetch(
      new Request('https://fake-host/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      })
    );

    const data = await response.json();

    // Save to database
    await this.db.saveGame(data.game);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async undoLastEvent(gameId: string): Promise<Response> {
    // Get game from database to find chatId
    const game = await this.db.getGame(gameId);
    if (!game || !game.chatId) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = this.env.GAME_STATE.idFromName(game.chatId);
    const stub = this.env.GAME_STATE.get(id);

    const response = await stub.fetch(
      new Request('https://fake-host/events/last', {
        method: 'DELETE',
      })
    );

    const data = await response.json();

    // Update database
    await this.db.saveGame(data.game);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async processWhatsAppMessage(request: Request): Promise<Response> {
    // This will be implemented when WhatsApp integration is added
    return new Response(
      JSON.stringify({ message: 'WhatsApp integration coming soon' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
