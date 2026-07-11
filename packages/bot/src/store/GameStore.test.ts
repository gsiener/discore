import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStore } from './GameStore.js';
import { GameState } from '../durable-objects/GameState.js';
import { Game, GameStatus, EventType, TeamSide, GameSummary } from '@scorebot/shared';

const clone = <T>(value: T): T => structuredClone(value);

/**
 * Build a real GameState backed by an in-memory storage map, exactly like the
 * DO test harness. Using real GameState instances gives the store realistic
 * DO behavior (score updates, guards, recalculation) rather than stubs.
 */
function makeGameState(): GameState {
  const storageMap = new Map<string, any>();
  const ctx = {
    storage: {
      get: async (key: string) => storageMap.get(key),
      put: async (key: string, value: any) => {
        storageMap.set(key, value);
      },
      delete: async (key: string) => {
        storageMap.delete(key);
      },
    },
  };
  return new GameState(ctx as any, {} as any);
}

/**
 * Wrap a GameState in a stub that records each RPC call into a shared log
 * before delegating, so tests can assert DO-before-D1 ordering.
 */
function makeLoggingStub(game: GameState, callLog: string[]) {
  return {
    init: (input: any) => (callLog.push('do.init'), game.init(input)),
    getGame: () => (callLog.push('do.getGame'), game.getGame()),
    rehydrate: (g: any) => (callLog.push('do.rehydrate'), game.rehydrate(g)),
    addEvent: (input: any) => (callLog.push('do.addEvent'), game.addEvent(input)),
    undoLastEvent: () => (callLog.push('do.undoLastEvent'), game.undoLastEvent()),
    deleteEvent: (id: string) => (callLog.push('do.deleteEvent'), game.deleteEvent(id)),
    updateFields: (u: any) => (callLog.push('do.updateFields'), game.updateFields(u)),
    setLineups: (input: any) => (callLog.push('do.setLineups'), game.setLineups(input)),
    start: () => (callLog.push('do.start'), game.start()),
    end: () => (callLog.push('do.end'), game.end()),
  };
}

/** Fake DurableObjectNamespace: one persistent GameState per chatId. */
class FakeNamespace {
  private instances = new Map<string, GameState>();

  constructor(private readonly callLog: string[]) {}

  idFromName(name: string): string {
    return name; // id is the chatId itself
  }

  get(id: string) {
    if (!this.instances.has(id)) {
      this.instances.set(id, makeGameState());
    }
    return makeLoggingStub(this.instances.get(id)!, this.callLog);
  }
}

/** Fake DatabaseService: in-memory games keyed by id, recording call order. */
class FakeDatabaseService {
  games = new Map<string, Game>();
  failSaveWithEvents = false;
  failSaveMetadata = false;

  constructor(private readonly callLog: string[]) {}

  async getGame(gameId: string): Promise<Game | null> {
    this.callLog.push('db.getGame');
    const game = this.games.get(gameId);
    return game ? clone(game) : null;
  }

  async getGameMetadata(gameId: string): Promise<Game | null> {
    this.callLog.push('db.getGameMetadata');
    const game = this.games.get(gameId);
    return game ? clone(game) : null;
  }

  async saveGame(game: Game): Promise<void> {
    this.callLog.push('db.saveGame');
    this.games.set(game.id, clone(game));
  }

  async saveGameWithEvents(game: Game): Promise<void> {
    this.callLog.push('db.saveGameWithEvents');
    if (this.failSaveWithEvents) throw new Error('D1 write failed');
    this.games.set(game.id, clone(game));
  }

  async saveGameMetadata(game: Game): Promise<void> {
    this.callLog.push('db.saveGameMetadata');
    if (this.failSaveMetadata) throw new Error('D1 write failed');
    this.games.set(game.id, clone(game));
  }

  async listGames(_limit: number): Promise<GameSummary[]> {
    this.callLog.push('db.listGames');
    return [...this.games.values()].map(g => ({
      id: g.id,
      status: g.status,
      teams: g.teams,
      score: g.score,
    })) as GameSummary[];
  }

  async deleteGame(gameId: string): Promise<void> {
    this.callLog.push('db.deleteGame');
    this.games.delete(gameId);
  }
}

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    status: GameStatus.FIRST_HALF,
    teams: {
      us: { name: 'Team A', side: TeamSide.US },
      them: { name: 'Team B', side: TeamSide.THEM },
    },
    score: { us: 0, them: 0 },
    events: [
      {
        id: 'evt_start',
        gameId: 'g1',
        type: EventType.GAME_START,
        timestamp: 1000,
        score: { us: 0, them: 0 },
      },
    ],
    chatId: 'c1',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('GameStore', () => {
  let callLog: string[];
  let namespace: FakeNamespace;
  let db: FakeDatabaseService;
  let store: GameStore;

  beforeEach(() => {
    callLog = [];
    namespace = new FakeNamespace(callLog);
    db = new FakeDatabaseService(callLog);
    store = new GameStore(namespace as any, db as any);
  });

  describe('createGame', () => {
    it('creates in the DO first, then persists a full save to D1', async () => {
      const game = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });

      expect(game.teams.us.name).toBe('Team A');
      expect(game.status).toBe(GameStatus.NOT_STARTED);
      // DO write precedes the D1 write, and creation uses the full save.
      expect(callLog).toEqual(['do.init', 'db.saveGame']);
      expect(db.games.get(game.id)).toBeDefined();
    });
  });

  describe('addEvent', () => {
    it('writes DO before D1 and uses saveGameWithEvents', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      callLog.length = 0;

      const result = await store.addEvent(created.id, {
        type: EventType.GOAL,
        team: TeamSide.US,
      });

      expect(result.game.score).toEqual({ us: 1, them: 0 });
      expect(result.event.type).toBe(EventType.GOAL);

      // DO mutation strictly before the D1 persist.
      const doIdx = callLog.indexOf('do.addEvent');
      const dbIdx = callLog.indexOf('db.saveGameWithEvents');
      expect(doIdx).toBeGreaterThanOrEqual(0);
      expect(dbIdx).toBeGreaterThan(doIdx);
      // Event-mutating verb never touches the metadata-only save.
      expect(callLog).not.toContain('db.saveGameMetadata');

      // D1 reflects the DO's returned state.
      expect(db.games.get(created.id)!.score).toEqual({ us: 1, them: 0 });
    });

    it('propagates a D1 failure as an error (no silent success)', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      db.failSaveWithEvents = true;

      await expect(
        store.addEvent(created.id, { type: EventType.GOAL, team: TeamSide.US })
      ).rejects.toThrow('D1 write failed');
    });

    it('does not save to D1 when the DO rejects the mutation', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await store.addEvent(created.id, { type: EventType.HALFTIME });
      callLog.length = 0;

      await expect(
        store.addEvent(created.id, { type: EventType.HALFTIME })
      ).rejects.toMatchObject({ status: 409, message: 'Halftime already recorded' });

      // The failed DO mutation must not have triggered a D1 write.
      expect(callLog).not.toContain('db.saveGameWithEvents');
    });

    it('throws 404 when the game does not exist', async () => {
      await expect(
        store.addEvent('missing', { type: EventType.GOAL, team: TeamSide.US })
      ).rejects.toMatchObject({ status: 404, message: 'Game not found' });
    });
  });

  describe('rehydration of a cold DO', () => {
    it('seeds an evicted DO from the D1 row before mutating', async () => {
      // Seed D1 only; the DO for c1 has never been touched (cold/evicted).
      db.games.set('g1', makeGame());

      const result = await store.addEvent('g1', {
        type: EventType.GOAL,
        team: TeamSide.US,
      });

      // Existing GAME_START survived and the new goal was appended on top.
      expect(result.game.events).toHaveLength(2);
      expect(result.game.score).toEqual({ us: 1, them: 0 });

      // Ordering: probe DO (null) → load full row → rehydrate → mutate → save.
      const order = callLog.filter(c =>
        ['do.getGame', 'db.getGame', 'do.rehydrate', 'do.addEvent', 'db.saveGameWithEvents'].includes(c)
      );
      expect(order).toEqual([
        'do.getGame',
        'db.getGame',
        'do.rehydrate',
        'do.addEvent',
        'db.saveGameWithEvents',
      ]);
    });
  });

  describe('undoLastEvent', () => {
    it('uses saveGameWithEvents', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await store.addEvent(created.id, { type: EventType.GOAL, team: TeamSide.US });
      callLog.length = 0;

      const result = await store.undoLastEvent(created.id);

      expect(result.undone.type).toBe(EventType.GOAL);
      expect(callLog.indexOf('do.undoLastEvent')).toBeGreaterThanOrEqual(0);
      expect(callLog).toContain('db.saveGameWithEvents');
      expect(callLog).not.toContain('db.saveGameMetadata');
    });
  });

  describe('deleteEvent', () => {
    it('uses saveGameWithEvents', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      const goal = await store.addEvent(created.id, { type: EventType.GOAL, team: TeamSide.US });
      callLog.length = 0;

      const result = await store.deleteEvent(created.id, goal.event.id);

      expect(result.deleted.id).toBe(goal.event.id);
      const doIdx = callLog.indexOf('do.deleteEvent');
      const dbIdx = callLog.indexOf('db.saveGameWithEvents');
      expect(dbIdx).toBeGreaterThan(doIdx);
      expect(callLog).not.toContain('db.saveGameMetadata');
    });
  });

  describe('updateGame', () => {
    it('goes through the DO first, then saveGameMetadata (no divergence path)', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      callLog.length = 0;

      const game = await store.updateGame(created.id, {
        videoUrl: 'https://example.com/v',
        ourTeamName: 'Renamed A',
      });

      expect(game.videoUrl).toBe('https://example.com/v');
      expect(game.teams.us.name).toBe('Renamed A');

      // DO write strictly precedes D1, and it is a metadata-only save.
      const doIdx = callLog.indexOf('do.updateFields');
      const dbIdx = callLog.indexOf('db.saveGameMetadata');
      expect(doIdx).toBeGreaterThanOrEqual(0);
      expect(dbIdx).toBeGreaterThan(doIdx);
      expect(callLog).not.toContain('db.saveGameWithEvents');

      // D1 reflects the DO-applied patch (no silent divergence).
      expect(db.games.get(created.id)!.videoUrl).toBe('https://example.com/v');
      expect(db.games.get(created.id)!.teams.us.name).toBe('Renamed A');
    });

    it('propagates a D1 failure as an error', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      db.failSaveMetadata = true;

      await expect(
        store.updateGame(created.id, { videoUrl: 'x' })
      ).rejects.toThrow('D1 write failed');
    });
  });

  describe('setLineups', () => {
    it('uses saveGameMetadata', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      callLog.length = 0;

      const game = await store.setLineups(created.id, {
        lineups: [{ pointNumber: 1, players: ['Jake', 'Mason'] }],
      });

      expect(game.lineups).toHaveLength(1);
      const doIdx = callLog.indexOf('do.setLineups');
      const dbIdx = callLog.indexOf('db.saveGameMetadata');
      expect(dbIdx).toBeGreaterThan(doIdx);
      expect(callLog).not.toContain('db.saveGameWithEvents');
    });
  });

  describe('startGame / endGame', () => {
    it('start uses saveGameMetadata', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      callLog.length = 0;

      const result = await store.startGame(created.id);

      expect(result.game.status).toBe(GameStatus.FIRST_HALF);
      expect(callLog.indexOf('do.start')).toBeLessThan(callLog.indexOf('db.saveGameMetadata'));
      expect(callLog).not.toContain('db.saveGameWithEvents');
    });

    it('end uses saveGameMetadata', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await store.startGame(created.id);
      callLog.length = 0;

      const result = await store.endGame(created.id);

      expect(result.game.status).toBe(GameStatus.FINISHED);
      expect(callLog.indexOf('do.end')).toBeLessThan(callLog.indexOf('db.saveGameMetadata'));
    });
  });

  describe('getGame', () => {
    it('returns null when the game is not in D1', async () => {
      expect(await store.getGame('missing')).toBeNull();
    });

    it('prefers live DO state over the D1 row', async () => {
      const created = await store.createGame({
        chatId: 'c1',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await store.addEvent(created.id, { type: EventType.GOAL, team: TeamSide.US });

      const game = await store.getGame(created.id);
      expect(game!.score).toEqual({ us: 1, them: 0 });
    });

    it('rehydrates and returns the D1 row when the DO is cold', async () => {
      db.games.set('g1', makeGame({ score: { us: 3, them: 2 } }));

      const game = await store.getGame('g1');
      expect(game!.score).toEqual({ us: 3, them: 2 });
      expect(callLog).toContain('do.rehydrate');
    });
  });

  describe('deleteGame', () => {
    it('deletes from D1 and returns true', async () => {
      db.games.set('g1', makeGame());

      const ok = await store.deleteGame('g1');
      expect(ok).toBe(true);
      expect(db.games.has('g1')).toBe(false);
    });

    it('returns false for a missing game', async () => {
      expect(await store.deleteGame('missing')).toBe(false);
    });
  });
});
