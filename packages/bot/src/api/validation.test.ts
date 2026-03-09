import { describe, it, expect } from 'vitest';
import { CreateGameRequestSchema, AddEventRequestSchema } from './validation.js';

describe('CreateGameRequestSchema', () => {
  it('should parse a valid CreateGameRequest', () => {
    const input = {
      chatId: 'chat-123',
      ourTeamName: 'Tech',
      opponentName: 'Columbia',
    };
    const result = CreateGameRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chatId).toBe('chat-123');
      expect(result.data.ourTeamName).toBe('Tech');
      expect(result.data.opponentName).toBe('Columbia');
    }
  });

  it('should fail when chatId is missing', () => {
    const input = {
      ourTeamName: 'Tech',
      opponentName: 'Columbia',
    };
    const result = CreateGameRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should fail when ourTeamName is empty', () => {
    const input = {
      chatId: 'chat-123',
      ourTeamName: '',
      opponentName: 'Columbia',
    };
    const result = CreateGameRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('AddEventRequestSchema', () => {
  it('should parse a valid goal event with team "us"', () => {
    const input = {
      type: 'goal',
      team: 'us',
    };
    const result = AddEventRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('goal');
      expect(result.data.team).toBe('us');
    }
  });

  it('should fail with an invalid event type', () => {
    const input = {
      type: 'invalid_type',
      team: 'us',
    };
    const result = AddEventRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should fail with an invalid defensivePlay value', () => {
    const input = {
      type: 'goal',
      team: 'us',
      defensivePlay: 'foul',
    };
    const result = AddEventRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should parse optional fields: timestamp, score, startingOnOffense', () => {
    const input = {
      type: 'goal',
      team: 'us',
      timestamp: 1700000000000,
      score: { us: 3, them: 2 },
      startingOnOffense: true,
    };
    const result = AddEventRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timestamp).toBe(1700000000000);
      expect(result.data.score).toEqual({ us: 3, them: 2 });
      expect(result.data.startingOnOffense).toBe(true);
    }
  });
});
