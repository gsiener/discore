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
} from '@scorebot/shared';

export class GameState {
  private state: DurableObjectState;
  private game: Game | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Initialize game if not already loaded
      if (!this.game) {
        this.game = await this.state.storage.get<Game>('game');
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
          if (path === '/init') {
            return await this.initGame(request);
          }
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
    const { chatId, ourTeamName, opponentName } = await request.json();

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

    const { type, team, message, parsedBy } = await request.json();

    // Update score if it's a goal
    if (type === EventType.GOAL && team) {
      this.game.score[team as TeamSide]++;
    }

    // Update game status based on event type
    if (type === EventType.HALFTIME) {
      this.game.status = GameStatus.HALFTIME;
    } else if (type === EventType.SECOND_HALF_START) {
      this.game.status = GameStatus.SECOND_HALF;
    } else if (type === EventType.GAME_END) {
      this.game.status = GameStatus.FINISHED;
      this.game.finishedAt = Date.now();
    }

    const event: GameEvent = {
      id: generateId('event'),
      gameId: this.game.id,
      type,
      timestamp: Date.now(),
      score: { ...this.game.score },
      team: team as TeamSide,
      message,
      parsedBy,
    };

    this.game.events.push(event);
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

  private async saveGame(): Promise<void> {
    if (this.game) {
      await this.state.storage.put('game', this.game);
    }
  }
}
