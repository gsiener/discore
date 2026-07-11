/**
 * Durable Object for managing game state
 * Provides real-time game state management with in-memory performance.
 *
 * Exposes typed RPC methods (init, rehydrate, getGame, start, addEvent,
 * undoLastEvent, deleteEvent, updateFields, setLineups, end) instead of a
 * hand-written fetch() switch. Callers invoke these directly through the
 * Durable Object stub (see docs/adr/0002-do-rpc-transport.md).
 */

import { DurableObject } from 'cloudflare:workers';
import {
  Game,
  GameStatus,
  GameEvent,
  EventType,
  TeamSide,
  generateId,
  calculateScoreFromEvents,
  CreateGameRequest,
  AddEventRequest,
  SetLineupsRequest,
} from '@scorebot/shared';
import { Env } from '../types';

/**
 * Fields that PATCH /games/:id (and the DO's updateFields) may change.
 * This is the single source of truth for the metadata patch shape — it used
 * to be duplicated in the Router.
 */
export interface GameFieldUpdates {
  startingOnOffense?: boolean;
  videoUrl?: string;
  ourTeamName?: string;
  opponentName?: string;
  tournamentName?: string;
}

/** Result of a mutation that appends a lifecycle event. */
export interface GameEventResult {
  game: Game;
  event: GameEvent;
}

/** Result of undoing the last event. */
export interface UndoResult {
  game: Game;
  undone: GameEvent;
}

/** Result of deleting a specific event. */
export interface DeleteEventResult {
  game: Game;
  deleted: GameEvent;
}

/**
 * Error carrying the HTTP status the Router should surface. Thrown by RPC
 * methods (and by the GameStore) so the transport layer can map a domain
 * failure to the historical status code without inspecting message strings.
 */
export class GameStateError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GameStateError';
  }
}

export class GameState extends DurableObject<Env> {
  private game: Game | null = null;

  /**
   * Lazily load persisted game state into memory. Mirrors the historical
   * fetch() behaviour of hydrating `this.game` from storage on first touch.
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.game) {
      this.game = (await this.ctx.storage.get<Game>('game')) || null;
    }
  }

  /**
   * Create a new game in this Durable Object.
   */
  async init(input: CreateGameRequest): Promise<Game> {
    const { chatId, ourTeamName, opponentName, tournamentName, gameDate, gameOrder } = input;

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

    return this.game;
  }

  /**
   * Rehydrate game state from a full Game object (sourced from D1).
   * Called by the GameStore when the DO has been evicted and needs to
   * restore state before a subsequent operation.
   */
  async rehydrate(game: Game): Promise<Game> {
    this.game = game;
    await this.saveGame();

    return this.game;
  }

  /**
   * Return the current game, or null if this DO holds no game (evicted or
   * never initialized). The store treats null as a signal to rehydrate.
   */
  async getGame(): Promise<Game | null> {
    await this.ensureLoaded();
    return this.game;
  }

  async start(): Promise<GameEventResult> {
    await this.ensureLoaded();
    if (!this.game) {
      throw new GameStateError(404, 'Game not found');
    }

    if (this.game.status !== GameStatus.NOT_STARTED) {
      throw new GameStateError(400, 'Game already started');
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

    return { game: this.game, event };
  }

  async addEvent(input: AddEventRequest & { parsedBy?: string }): Promise<GameEventResult> {
    await this.ensureLoaded();
    if (!this.game) {
      throw new GameStateError(404, 'Game not found');
    }

    const { type, team, message, parsedBy, defensivePlay, startingOnOffense, timestamp, score } = input;

    // Prevent duplicate halftime events
    if (type === EventType.HALFTIME) {
      const existingHalftime = this.game.events.some(e => e.type === EventType.HALFTIME);
      if (existingHalftime) {
        throw new GameStateError(409, 'Halftime already recorded');
      }
    }

    // Update score if it's a goal
    if (type === EventType.GOAL && team) {
      if (score) {
        // Backfilling: use the provided score directly
        this.game.score = { ...score };
      } else {
        this.game.score[team as TeamSide]++;
      }
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

    return { game: this.game, event };
  }

  async end(): Promise<GameEventResult> {
    await this.ensureLoaded();
    if (!this.game) {
      throw new GameStateError(404, 'Game not found');
    }

    if (this.game.status === GameStatus.FINISHED) {
      throw new GameStateError(400, 'Game already finished');
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

    return { game: this.game, event };
  }

  async undoLastEvent(): Promise<UndoResult> {
    await this.ensureLoaded();
    if (!this.game || this.game.events.length === 0) {
      throw new GameStateError(400, 'No events to undo');
    }

    const lastEvent = this.game.events.pop()!;
    this.recalculateGameState();
    await this.saveGame();

    return { game: this.game, undone: lastEvent };
  }

  async deleteEvent(eventId: string): Promise<DeleteEventResult> {
    await this.ensureLoaded();
    if (!this.game) {
      throw new GameStateError(404, 'Game not found');
    }

    const idx = this.game.events.findIndex(e => e.id === eventId);
    if (idx === -1) {
      throw new GameStateError(404, 'Event not found');
    }

    const [removed] = this.game.events.splice(idx, 1);
    this.recalculateGameState();
    await this.saveGame();

    return { game: this.game, deleted: removed };
  }

  async updateFields(updates: GameFieldUpdates): Promise<Game> {
    await this.ensureLoaded();
    if (!this.game) {
      throw new GameStateError(404, 'Game not found');
    }

    if (updates.startingOnOffense !== undefined) {
      this.game.startingOnOffense = updates.startingOnOffense;
    }
    if (updates.videoUrl !== undefined) {
      this.game.videoUrl = updates.videoUrl;
    }
    if (updates.ourTeamName !== undefined) {
      this.game.teams.us.name = updates.ourTeamName;
    }
    if (updates.tournamentName !== undefined) {
      this.game.tournamentName = updates.tournamentName;
    }
    if (updates.opponentName !== undefined) {
      this.game.teams.them.name = updates.opponentName;
    }

    this.game.updatedAt = Date.now();
    await this.saveGame();

    return this.game;
  }

  async setLineups(input: SetLineupsRequest): Promise<Game> {
    await this.ensureLoaded();
    if (!this.game) {
      throw new GameStateError(404, 'Game not found');
    }

    this.game.lineups = input.lineups;
    this.game.updatedAt = Date.now();
    await this.saveGame();

    return this.game;
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
      await this.ctx.storage.put('game', this.game);
    }
  }
}
