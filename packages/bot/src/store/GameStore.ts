/**
 * GameStore — the single coordinator of the DO + D1 dual-write.
 *
 * Per docs/adr/0001-do-first-dual-write.md the Durable Object is authoritative
 * for a live game: every mutation goes DO-first, then the DO's returned state
 * is persisted to D1 synchronously. A D1 failure surfaces as a thrown error —
 * there is no fire-and-forget and no reversed ordering. This is the ONLY place
 * that talks to both stores; the Router is a thin HTTP adapter over it.
 */

import {
  Game,
  GameSummary,
  CreateGameRequest,
  AddEventRequest,
  SetLineupsRequest,
} from '@scorebot/shared';
import { DatabaseService } from '../db/database.js';
import {
  GameState,
  GameStateError,
  GameFieldUpdates,
  GameEventResult,
  UndoResult,
  DeleteEventResult,
} from '../durable-objects/GameState.js';

export class GameStore {
  constructor(
    private readonly namespace: DurableObjectNamespace<GameState>,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Create and persist a new game. New games have no events yet, so a full
   * save (metadata + events) is used.
   */
  async createGame(input: CreateGameRequest): Promise<Game> {
    const stub = this.namespace.get(this.namespace.idFromName(input.chatId));
    const game = await stub.init(input);
    await this.db.saveGame(game);
    return game;
  }

  /**
   * Read a game. Prefers the live DO state (rehydrating a cold DO from D1),
   * falling back to the D1 row if the DO is unavailable.
   */
  async getGame(gameId: string): Promise<Game | null> {
    const game = await this.db.getGame(gameId);
    if (!game) return null;

    if (game.chatId) {
      try {
        const stub = this.namespace.get(this.namespace.idFromName(game.chatId));
        const current = await stub.getGame();
        if (current === null) {
          // DO evicted — seed it from the D1 row and return that.
          return await stub.rehydrate(game);
        }
        return current;
      } catch {
        // Fall back to the D1 version on any DO error.
      }
    }

    return game;
  }

  async listGames(limit: number): Promise<GameSummary[]> {
    return this.db.listGames(limit);
  }

  // --- Event-mutating verbs: persist with saveGameWithEvents ---

  async addEvent(
    gameId: string,
    input: AddEventRequest & { parsedBy?: string },
  ): Promise<GameEventResult> {
    const stub = await this.hydratedStub(gameId);
    const result = await stub.addEvent(input);
    await this.db.saveGameWithEvents(result.game);
    return result;
  }

  async undoLastEvent(gameId: string): Promise<UndoResult> {
    const stub = await this.hydratedStub(gameId);
    const result = await stub.undoLastEvent();
    await this.db.saveGameWithEvents(result.game);
    return result;
  }

  async deleteEvent(gameId: string, eventId: string): Promise<DeleteEventResult> {
    const stub = await this.hydratedStub(gameId);
    const result = await stub.deleteEvent(eventId);
    await this.db.saveGameWithEvents(result.game);
    return result;
  }

  // --- Metadata-only verbs: persist with saveGameMetadata ---

  async updateGame(gameId: string, updates: GameFieldUpdates): Promise<Game> {
    const stub = await this.hydratedStub(gameId);
    const game = await stub.updateFields(updates);
    await this.db.saveGameMetadata(game);
    return game;
  }

  async setLineups(gameId: string, input: SetLineupsRequest): Promise<Game> {
    // Lineups live in a games-table column, so this is a metadata-only save.
    const stub = await this.hydratedStub(gameId);
    const game = await stub.setLineups(input);
    await this.db.saveGameMetadata(game);
    return game;
  }

  async startGame(gameId: string): Promise<GameEventResult> {
    const stub = await this.hydratedStub(gameId);
    const result = await stub.start();
    await this.db.saveGameMetadata(result.game);
    return result;
  }

  async endGame(gameId: string): Promise<GameEventResult> {
    const stub = await this.hydratedStub(gameId);
    const result = await stub.end();
    await this.db.saveGameMetadata(result.game);
    return result;
  }

  /**
   * Delete a game (and its events, via D1 cascade). D1-only: there is no live
   * state to keep for a deleted game. Returns false if the game did not exist.
   */
  async deleteGame(gameId: string): Promise<boolean> {
    const meta = await this.db.getGameMetadata(gameId);
    if (!meta) return false;

    await this.db.deleteGame(gameId);
    return true;
  }

  /**
   * Resolve the Durable Object stub for a game, ensuring it holds state.
   * Probe semantics mirror the former ensureDOHydrated: if the DO reports no
   * game (evicted), seed it from the full D1 row before returning.
   *
   * Throws GameStateError(404) when the game does not exist and
   * GameStateError(500) when a cold DO cannot be restored from D1.
   */
  private async hydratedStub(
    gameId: string,
  ): Promise<DurableObjectStub<GameState>> {
    // Only metadata (chatId) is needed to route to the DO.
    const meta = await this.db.getGameMetadata(gameId);
    if (!meta || !meta.chatId) {
      throw new GameStateError(404, 'Game not found');
    }

    const stub = this.namespace.get(this.namespace.idFromName(meta.chatId));

    const current = await stub.getGame();
    if (current === null) {
      // DO evicted — need the full game (with events) to rehydrate.
      const full = await this.db.getGame(gameId);
      if (!full) {
        throw new GameStateError(500, 'Failed to restore game state');
      }
      await stub.rehydrate(full);
    }

    return stub;
  }
}
