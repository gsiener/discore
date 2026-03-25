/**
 * Durable Object for managing game state
 * Provides real-time game state management with in-memory performance
 */

import {
  Game,
  GameStatus,
  GameEvent,
  EventType,
  TeamSide,
  Score,
  generateId,
  calculateScoreFromEvents,
  CreateGameRequest,
  CreateGameResponse,
  AddEventRequest,
  AddEventResponse,
  SetLineupsRequest,
} from '@scorebot/shared';
import { Env } from '../types';

export class GameState implements DurableObject {
  private state: DurableObjectState;
  private game: Game | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Allow /init to create a new game
      if (request.method === 'POST' && path === '/init') {
        return await this.initGame(request);
      }

      // Allow /rehydrate to restore game state from D1 data
      if (request.method === 'POST' && path === '/rehydrate') {
        return await this.rehydrateGame(request);
      }

      // Initialize game if not already loaded
      if (!this.game) {
        this.game = (await this.state.storage.get<Game>('game')) || null;
        if (!this.game) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      switch (request.method) {
        case 'GET':
          if (path === '/') {
            return this.getGame();
          }
          break;

        case 'POST':
          if (path === '/events') {
            return await this.addEvent(request);
          }
          if (path === '/start') {
            return await this.startGame();
          }
          if (path === '/end') {
            return await this.endGame();
          }
          break;

        case 'PATCH':
          if (path === '/update') {
            return await this.updateFields(request);
          }
          if (path === '/lineups') {
            return await this.setLineups(request);
          }
          break;

        case 'DELETE':
          if (path === '/events/last') {
            return await this.undoLastEvent();
          }
          if (path.match(/^\/events\/[^/]+$/)) {
            const eventId = path.split('/')[2];
            return await this.deleteEvent(eventId);
          }
          break;
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Error in GameState:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private async initGame(request: Request): Promise<Response> {
    const { chatId, ourTeamName, opponentName, tournamentName, gameDate, gameOrder } = await request.json() as CreateGameRequest;

    this.game = {
      id: generateId('game'),
      status: GameStatus.NOT_STARTED,
      teams: {
        us: { name: ourTeamName, side: TeamSide.US },
        them: { name: opponentName, side: TeamSide.THEM },
      },
      score: { us: 0, them: 0 },
      events: [],
      chatId,
      tournamentName,
      gameDate,
      gameOrder,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveGame();

    return new Response(JSON.stringify({ game: this.game }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Rehydrate game state from D1 data
   * Called by the router when the DO has been evicted and needs to restore state
   */
  private async rehydrateGame(request: Request): Promise<Response> {
    const game = await request.json() as Game;

    this.game = game;
    await this.saveGame();

    return new Response(JSON.stringify({ game: this.game }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private getGame(): Response {
    return new Response(JSON.stringify({ game: this.game }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async startGame(): Promise<Response> {
    if (!this.game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (this.game.status !== GameStatus.NOT_STARTED) {
      return new Response(
        JSON.stringify({ error: 'Game already started' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    this.game.status = GameStatus.FIRST_HALF;
    this.game.startedAt = Date.now();
    this.game.updatedAt = Date.now();

    const event: GameEvent = {
      id: generateId('event'),
      gameId: this.game.id,
      type: EventType.GAME_START,
      timestamp: Date.now(),
      score: { ...this.game.score },
    };

    this.game.events.push(event);
    await this.saveGame();

    return new Response(JSON.stringify({ game: this.game, event }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async addEvent(request: Request): Promise<Response> {
    if (!this.game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { type, team, message, parsedBy, defensivePlay, startingOnOffense, timestamp, score } = await request.json() as AddEventRequest & { parsedBy?: string };

    // Prevent duplicate halftime events
    if (type === EventType.HALFTIME) {
      const existingHalftime = this.game.events.some(e => e.type === EventType.HALFTIME);
      if (existingHalftime) {
        return new Response(
          JSON.stringify({ error: 'Halftime already recorded' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update score if it's a goal (and no custom score provided for backfilling)
    if (type === EventType.GOAL && team && !score) {
      this.game.score[team as TeamSide]++;
    }

    // Update game status based on event type
    const eventTime = timestamp || Date.now();
    if (type === EventType.GAME_START) {
      this.game.status = GameStatus.FIRST_HALF;
      this.game.startedAt = eventTime;
      if (startingOnOffense !== undefined) {
        this.game.startingOnOffense = startingOnOffense;
      }
    } else if (type === EventType.HALFTIME) {
      this.game.status = GameStatus.HALFTIME;
    } else if (type === EventType.SECOND_HALF_START) {
      this.game.status = GameStatus.SECOND_HALF;
    } else if (type === EventType.GAME_END) {
      this.game.status = GameStatus.FINISHED;
      this.game.finishedAt = eventTime;
    }

    const event: GameEvent = {
      id: generateId('event'),
      gameId: this.game.id,
      type,
      timestamp: timestamp || Date.now(), // Use provided timestamp or current time
      score: score || { ...this.game.score }, // Use provided score or current score
      team: team as TeamSide,
      message,
      parsedBy,
      defensivePlay,
    };

    this.game.events.push(event);
    // Re-sort events by timestamp to maintain chronological order
    this.game.events.sort((a, b) => a.timestamp - b.timestamp);
    this.game.updatedAt = Date.now();
    await this.saveGame();

    return new Response(JSON.stringify({ game: this.game, event }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async endGame(): Promise<Response> {
    if (!this.game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (this.game.status === GameStatus.FINISHED) {
      return new Response(
        JSON.stringify({ error: 'Game already finished' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    this.game.status = GameStatus.FINISHED;
    this.game.finishedAt = Date.now();
    this.game.updatedAt = Date.now();

    const event: GameEvent = {
      id: generateId('event'),
      gameId: this.game.id,
      type: EventType.GAME_END,
      timestamp: Date.now(),
      score: { ...this.game.score },
    };

    this.game.events.push(event);
    await this.saveGame();

    return new Response(JSON.stringify({ game: this.game, event }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async undoLastEvent(): Promise<Response> {
    if (!this.game || this.game.events.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No events to undo' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lastEvent = this.game.events.pop();
    this.recalculateGameState();
    await this.saveGame();

    return new Response(
      JSON.stringify({ game: this.game, undone: lastEvent }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async deleteEvent(eventId: string): Promise<Response> {
    if (!this.game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const idx = this.game.events.findIndex(e => e.id === eventId);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const [removed] = this.game.events.splice(idx, 1);
    this.recalculateGameState();
    await this.saveGame();

    return new Response(
      JSON.stringify({ game: this.game, deleted: removed }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async updateFields(request: Request): Promise<Response> {
    if (!this.game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates = await request.json() as { startingOnOffense?: boolean };

    if (updates.startingOnOffense !== undefined) {
      this.game.startingOnOffense = updates.startingOnOffense;
    }

    this.game.updatedAt = Date.now();
    await this.saveGame();

    return new Response(JSON.stringify({ game: this.game }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async setLineups(request: Request): Promise<Response> {
    if (!this.game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { lineups } = await request.json() as SetLineupsRequest;
    this.game.lineups = lineups;
    this.game.updatedAt = Date.now();
    await this.saveGame();

    return new Response(JSON.stringify({ game: this.game }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private recalculateGameState(): void {
    if (!this.game) return;

    this.game.score = calculateScoreFromEvents(this.game.events);

    let status = GameStatus.NOT_STARTED;
    this.game.startedAt = undefined;
    this.game.finishedAt = undefined;
    for (const event of this.game.events) {
      if (event.type === EventType.GAME_START) {
        status = GameStatus.FIRST_HALF;
        this.game.startedAt = event.timestamp;
      } else if (event.type === EventType.HALFTIME) {
        status = GameStatus.HALFTIME;
      } else if (event.type === EventType.SECOND_HALF_START) {
        status = GameStatus.SECOND_HALF;
      } else if (event.type === EventType.GAME_END) {
        status = GameStatus.FINISHED;
        this.game.finishedAt = event.timestamp;
      }
    }
    this.game.status = status;
    this.game.updatedAt = Date.now();
  }

  private async saveGame(): Promise<void> {
    if (this.game) {
      await this.state.storage.put('game', this.game);
    }
  }

}
