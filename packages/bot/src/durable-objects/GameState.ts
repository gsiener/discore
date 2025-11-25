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
  CreateGameRequest,
  CreateGameResponse,
  AddEventRequest,
  AddEventResponse,
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

      // Initialize game if not already loaded
      if (!this.game) {
        this.game = (await this.state.storage.get<Game>('game')) || null;
        if (!this.game) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // Clean up duplicate/incorrect halftime events on load
        await this.cleanupHalftimeEvents();
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
          break;

        case 'DELETE':
          if (path === '/events/last') {
            return await this.undoLastEvent();
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

    // Update score if it's a goal (and no custom score provided for backfilling)
    if (type === EventType.GOAL && team && !score) {
      this.game.score[team as TeamSide]++;
    }

    // Update game status based on event type (only if not backfilling)
    if (!timestamp) {
      if (type === EventType.GAME_START) {
        this.game.status = GameStatus.FIRST_HALF;
        this.game.startedAt = Date.now();
        // Store whether we're starting on offense
        if (startingOnOffense !== undefined) {
          this.game.startingOnOffense = startingOnOffense;
        }
      } else if (type === EventType.HALFTIME) {
        this.game.status = GameStatus.HALFTIME;
      } else if (type === EventType.SECOND_HALF_START) {
        this.game.status = GameStatus.SECOND_HALF;
      } else if (type === EventType.GAME_END) {
        this.game.status = GameStatus.FINISHED;
        this.game.finishedAt = Date.now();
      }
    } else {
      // When backfilling with custom timestamp, only update startingOnOffense if provided
      if (type === EventType.GAME_START && startingOnOffense !== undefined) {
        this.game.startingOnOffense = startingOnOffense;
      }
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

    // Recalculate score from remaining events
    this.game.score = { us: 0, them: 0 };
    for (const event of this.game.events) {
      if (event.type === EventType.GOAL && event.team) {
        this.game.score[event.team]++;
      }
    }

    // Update status based on remaining events
    const lastRemainingEvent = this.game.events[this.game.events.length - 1];
    if (lastRemainingEvent) {
      if (lastRemainingEvent.type === EventType.HALFTIME) {
        this.game.status = GameStatus.HALFTIME;
      } else if (lastRemainingEvent.type === EventType.SECOND_HALF_START) {
        this.game.status = GameStatus.SECOND_HALF;
      } else if (lastRemainingEvent.type === EventType.GAME_START) {
        this.game.status = GameStatus.FIRST_HALF;
      }
    } else {
      this.game.status = GameStatus.NOT_STARTED;
      this.game.startedAt = undefined;
    }

    this.game.updatedAt = Date.now();
    await this.saveGame();

    return new Response(
      JSON.stringify({ game: this.game, undone: lastEvent }),
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

  private async saveGame(): Promise<void> {
    if (this.game) {
      await this.state.storage.put('game', this.game);
    }
  }

  /**
   * Clean up duplicate or incorrect halftime events
   * Keeps only the halftime event with correct score (7 for 13-point, 8 for 15-point)
   * Also fixes game status if it's stuck at halftime but should be finished
   */
  private async cleanupHalftimeEvents(): Promise<void> {
    if (!this.game) return;

    let needsSave = false;

    const halftimeEvents = this.game.events.filter(e => e.type === EventType.HALFTIME);

    if (halftimeEvents.length > 1) {
      const finalScore = Math.max(this.game.score.us, this.game.score.them);
      let threshold: number;

      if (finalScore === 15) {
        threshold = 8;
      } else if (finalScore === 13) {
        threshold = 7;
      } else {
        threshold = 0; // Not a standard game
      }

      if (threshold > 0) {
        // Find all halftime events with correct score
        const correctHalftimes = halftimeEvents.filter(e =>
          e.score.us === threshold || e.score.them === threshold
        );

        if (correctHalftimes.length > 0) {
          // Keep only the earliest one by timestamp
          const earliestHalftime = correctHalftimes.reduce((earliest, current) =>
            current.timestamp < earliest.timestamp ? current : earliest
          );

          // Remove all halftime events except the earliest correct one
          this.game.events = this.game.events.filter(e =>
            e.type !== EventType.HALFTIME || e.id === earliestHalftime.id
          );

          needsSave = true;
          console.log(`Cleaned up halftime events for game ${this.game.id}, kept earliest at ${earliestHalftime.score.us}-${earliestHalftime.score.them}`);
        }
      }
    }

    // Fix status if game has game_end event but status is stuck at halftime
    const hasGameEnd = this.game.events.some(e => e.type === EventType.GAME_END);
    if (hasGameEnd && this.game.status === GameStatus.HALFTIME) {
      this.game.status = GameStatus.FINISHED;
      needsSave = true;
      console.log(`Fixed status for game ${this.game.id} from halftime to finished`);
    }

    if (needsSave) {
      await this.saveGame();
    }
  }
}
