import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from './GameState.js';
import { GameStatus, EventType, TeamSide } from '@scorebot/shared';

// Mock DurableObjectState — the DurableObject base wires this to `this.ctx`.
class MockDurableObjectState {
  private storageMap = new Map<string, any>();

  storage = {
    get: vi.fn(async (key: string) => this.storageMap.get(key)),
    put: vi.fn(async (key: string, value: any) => {
      this.storageMap.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      this.storageMap.delete(key);
    }),
    list: vi.fn(),
    getAlarm: vi.fn(),
    setAlarm: vi.fn(),
    deleteAlarm: vi.fn(),
  };

  async blockConcurrencyWhile(callback: () => Promise<void>): Promise<void> {
    await callback();
  }
}

describe('GameState', () => {
  let gameState: GameState;
  let mockState: MockDurableObjectState;
  let mockEnv: any;

  beforeEach(() => {
    mockState = new MockDurableObjectState();
    mockEnv = {};
    gameState = new GameState(mockState as any, mockEnv);
  });

  describe('init', () => {
    it('should initialize a new game', async () => {
      const game = await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });

      expect(game).toBeDefined();
      expect(game.status).toBe(GameStatus.NOT_STARTED);
      expect(game.teams.us.name).toBe('Team A');
      expect(game.teams.them.name).toBe('Team B');
      expect(game.score).toEqual({ us: 0, them: 0 });
      expect(game.events).toHaveLength(0);
      expect(game.chatId).toBe('chat123');
    });

    it('should save game to storage', async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });

      expect(mockState.storage.put).toHaveBeenCalledWith(
        'game',
        expect.objectContaining({
          status: GameStatus.NOT_STARTED,
          teams: {
            us: { name: 'Team A', side: TeamSide.US },
            them: { name: 'Team B', side: TeamSide.THEM },
          },
        })
      );
    });
  });

  describe('getGame', () => {
    it('should return null if game not initialized', async () => {
      const game = await gameState.getGame();
      expect(game).toBeNull();
    });

    it('should return game if initialized', async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });

      const game = await gameState.getGame();
      expect(game).toBeDefined();
      expect(game!.teams.us.name).toBe('Team A');
    });
  });

  describe('start', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
    });

    it('should start a not started game', async () => {
      const result = await gameState.start();

      expect(result.game.status).toBe(GameStatus.FIRST_HALF);
      expect(result.game.startedAt).toBeDefined();
      expect(result.event.type).toBe(EventType.GAME_START);
      expect(result.game.events).toHaveLength(1);
    });

    it('should throw if game already started', async () => {
      await gameState.start();

      await expect(gameState.start()).rejects.toMatchObject({
        status: 400,
        message: 'Game already started',
      });
    });
  });

  describe('startingOnOffense', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
    });

    it('should store startingOnOffense when adding GAME_START event', async () => {
      const result = await gameState.addEvent({
        type: EventType.GAME_START,
        startingOnOffense: true,
      });

      expect(result.game.startingOnOffense).toBe(true);
      expect(result.game.status).toBe(GameStatus.FIRST_HALF);
    });

    it('should store startingOnOffense=false when opponent starts on offense', async () => {
      const result = await gameState.addEvent({
        type: EventType.GAME_START,
        startingOnOffense: false,
      });

      expect(result.game.startingOnOffense).toBe(false);
    });

    it('should allow updating startingOnOffense field', async () => {
      const game = await gameState.updateFields({ startingOnOffense: true });

      expect(game.startingOnOffense).toBe(true);
    });
  });

  describe('addEvent', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await gameState.start();
    });

    it('should add a goal event and update score', async () => {
      const result = await gameState.addEvent({
        type: EventType.GOAL,
        team: TeamSide.US,
        message: 'Goal!',
        parsedBy: 'test',
      });

      expect(result.game.score).toEqual({ us: 1, them: 0 });
      expect(result.event.type).toBe(EventType.GOAL);
      expect(result.event.team).toBe(TeamSide.US);
      expect(result.game.events).toHaveLength(2); // GAME_START + GOAL
    });

    it('should add multiple goal events', async () => {
      await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.US });
      await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.THEM });
      const result = await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.US });

      expect(result.game.score).toEqual({ us: 2, them: 1 });
    });

    it('should add halftime event and update status', async () => {
      const result = await gameState.addEvent({ type: EventType.HALFTIME });

      expect(result.game.status).toBe(GameStatus.HALFTIME);
      expect(result.event.type).toBe(EventType.HALFTIME);
    });

    it('should add second half start event and update status', async () => {
      const result = await gameState.addEvent({ type: EventType.SECOND_HALF_START });

      expect(result.game.status).toBe(GameStatus.SECOND_HALF);
      expect(result.event.type).toBe(EventType.SECOND_HALF_START);
    });

    it('should add game end event and update status', async () => {
      const result = await gameState.addEvent({ type: EventType.GAME_END });

      expect(result.game.status).toBe(GameStatus.FINISHED);
      expect(result.game.finishedAt).toBeDefined();
      expect(result.event.type).toBe(EventType.GAME_END);
    });

    it('should preserve event message and parsedBy', async () => {
      const result = await gameState.addEvent({
        type: EventType.GOAL,
        team: TeamSide.US,
        message: 'Amazing goal!',
        parsedBy: 'whatsapp:+1234567890',
      });

      expect(result.event.message).toBe('Amazing goal!');
      expect(result.event.parsedBy).toBe('whatsapp:+1234567890');
    });
  });

  describe('end', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await gameState.start();
    });

    it('should end an active game', async () => {
      const result = await gameState.end();

      expect(result.game.status).toBe(GameStatus.FINISHED);
      expect(result.game.finishedAt).toBeDefined();
      expect(result.event.type).toBe(EventType.GAME_END);
    });

    it('should throw if game already finished', async () => {
      await gameState.end();

      await expect(gameState.end()).rejects.toMatchObject({
        status: 400,
        message: 'Game already finished',
      });
    });
  });

  describe('undoLastEvent', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await gameState.start();
    });

    it('should undo the last event', async () => {
      await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.US });

      const result = await gameState.undoLastEvent();

      expect(result.undone.type).toBe(EventType.GOAL);
      expect(result.game.events).toHaveLength(1); // Only GAME_START remains
      expect(result.game.score).toEqual({ us: 0, them: 0 });
    });

    it('should recalculate score after undo', async () => {
      await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.US });
      await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.US });
      await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.THEM });

      const result = await gameState.undoLastEvent();

      expect(result.game.score).toEqual({ us: 2, them: 0 });
    });

    it('should update status when undoing halftime', async () => {
      await gameState.addEvent({ type: EventType.HALFTIME });

      const result = await gameState.undoLastEvent();

      expect(result.game.status).toBe(GameStatus.FIRST_HALF);
    });

    it('should reset to NOT_STARTED when undoing game start', async () => {
      const result = await gameState.undoLastEvent();

      expect(result.game.status).toBe(GameStatus.NOT_STARTED);
      expect(result.game.startedAt).toBeUndefined();
      expect(result.game.events).toHaveLength(0);
    });

    it('should throw if no events to undo', async () => {
      // Undo game start first, leaving no events.
      await gameState.undoLastEvent();

      await expect(gameState.undoLastEvent()).rejects.toMatchObject({
        status: 400,
        message: 'No events to undo',
      });
    });
  });

  describe('deleteEvent', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await gameState.start();
    });

    it('should delete a specific event by id and recalculate', async () => {
      const goal = await gameState.addEvent({ type: EventType.GOAL, team: TeamSide.US });

      const result = await gameState.deleteEvent(goal.event.id);

      expect(result.deleted.id).toBe(goal.event.id);
      expect(result.game.score).toEqual({ us: 0, them: 0 });
      expect(result.game.events).toHaveLength(1); // Only GAME_START remains
    });

    it('should throw 404 if event not found', async () => {
      await expect(gameState.deleteEvent('event_does_not_exist')).rejects.toMatchObject({
        status: 404,
        message: 'Event not found',
      });
    });
  });

  describe('duplicate halftime guard', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
      await gameState.start();
    });

    it('should reject a second halftime event with 409', async () => {
      await gameState.addEvent({ type: EventType.HALFTIME });

      await expect(gameState.addEvent({ type: EventType.HALFTIME })).rejects.toMatchObject({
        status: 409,
        message: 'Halftime already recorded',
      });
    });
  });

  describe('rehydrate', () => {
    it('should restore game state from a full Game object', async () => {
      const mockGame: any = {
        id: 'game_rehydrated123',
        status: GameStatus.FIRST_HALF,
        teams: {
          us: { name: 'Rehydrated A', side: TeamSide.US },
          them: { name: 'Rehydrated B', side: TeamSide.THEM },
        },
        score: { us: 3, them: 2 },
        events: [
          {
            id: 'event_1',
            gameId: 'game_rehydrated123',
            type: EventType.GAME_START,
            timestamp: 1000,
            score: { us: 0, them: 0 },
          },
        ],
        chatId: 'chat_rehydrated',
        startedAt: 1000,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const game = await gameState.rehydrate(mockGame);
      expect(game.id).toBe('game_rehydrated123');
      expect(game.status).toBe(GameStatus.FIRST_HALF);
      expect(game.score).toEqual({ us: 3, them: 2 });
      expect(game.teams.us.name).toBe('Rehydrated A');

      // Verify getGame returns the rehydrated game
      const fetched = await gameState.getGame();
      expect(fetched!.id).toBe('game_rehydrated123');
      expect(fetched!.score).toEqual({ us: 3, them: 2 });
    });
  });

  describe('backfill status transitions', () => {
    beforeEach(async () => {
      await gameState.init({
        chatId: 'chat123',
        ourTeamName: 'Team A',
        opponentName: 'Team B',
      });
    });

    it('should use provided timestamp for game_start startedAt', async () => {
      const customTimestamp = 1700000000000;

      const result = await gameState.addEvent({
        type: EventType.GAME_START,
        timestamp: customTimestamp,
      });

      expect(result.game.status).toBe(GameStatus.FIRST_HALF);
      expect(result.game.startedAt).toBe(customTimestamp);
      expect(result.event.timestamp).toBe(customTimestamp);
    });

    it('should use provided timestamp for game_end finishedAt', async () => {
      await gameState.start();

      const customTimestamp = 1700003600000;

      const result = await gameState.addEvent({
        type: EventType.GAME_END,
        timestamp: customTimestamp,
      });

      expect(result.game.status).toBe(GameStatus.FINISHED);
      expect(result.game.finishedAt).toBe(customTimestamp);
      expect(result.event.timestamp).toBe(customTimestamp);
    });
  });

  describe('error handling', () => {
    it('should propagate storage errors from a mutation', async () => {
      mockState.storage.put = vi.fn().mockRejectedValue(new Error('Storage error'));

      await expect(
        gameState.init({
          chatId: 'chat123',
          ourTeamName: 'Team A',
          opponentName: 'Team B',
        })
      ).rejects.toThrow('Storage error');
    });
  });
});
