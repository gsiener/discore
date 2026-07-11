import { describe, it, expect } from 'vitest';
import { EventType, TeamSide } from '@scorebot/shared';
import { toEpochMs, toAddEventRequest, loadTournament, TournamentSpec } from './loader.js';

describe('toEpochMs — timezone conversion', () => {
  it('resolves EDT (UTC-4) for a March date after spring-forward', () => {
    // US DST 2026 begins Sun Mar 8. Mar 22 is firmly in EDT → UTC-4.
    // 10:00 America/New_York => 14:00 UTC.
    expect(toEpochMs('2026-03-22', '10:00', 'America/New_York')).toBe(
      Date.UTC(2026, 2, 22, 14, 0, 0)
    );
  });

  it('resolves EST (UTC-5) for a November date after fall-back', () => {
    // US DST 2026 ends Sun Nov 1. Nov 8 is firmly in EST → UTC-5.
    // 10:00 America/New_York => 15:00 UTC.
    expect(toEpochMs('2026-11-08', '10:00', 'America/New_York')).toBe(
      Date.UTC(2026, 10, 8, 15, 0, 0)
    );
  });

  it('resolves EST for a mid-winter date', () => {
    expect(toEpochMs('2026-01-15', '09:30', 'America/New_York')).toBe(
      Date.UTC(2026, 0, 15, 14, 30, 0)
    );
  });

  it('resolves EDT for a mid-summer date', () => {
    expect(toEpochMs('2026-07-15', '13:45', 'America/New_York')).toBe(
      Date.UTC(2026, 6, 15, 17, 45, 0)
    );
  });

  it('honors a different IANA zone (US Pacific)', () => {
    // PDT in July = UTC-7. 08:00 => 15:00 UTC.
    expect(toEpochMs('2026-07-15', '08:00', 'America/Los_Angeles')).toBe(
      Date.UTC(2026, 6, 15, 15, 0, 0)
    );
  });

  it('supports HH:MM:SS times', () => {
    expect(toEpochMs('2026-07-15', '13:45:30', 'America/New_York')).toBe(
      Date.UTC(2026, 6, 15, 17, 45, 30)
    );
  });

  it('rejects malformed input', () => {
    expect(() => toEpochMs('07/15/2026', '10:00')).toThrow();
    expect(() => toEpochMs('2026-07-15', '10')).toThrow();
  });
});

describe('toAddEventRequest — spec → shared AddEventRequest', () => {
  const game = {
    date: '2026-03-22',
    ourTeam: 'Tech Support',
    opponent: 'Haverford',
    startingOnOffense: true,
    events: [],
  };

  it('maps team strings to TeamSide and carries defensivePlay', () => {
    const req = toAddEventRequest(
      { time: '10:16', type: EventType.GOAL, team: 'us', message: 'Mason to Jake', defensivePlay: 'block' },
      game,
      'America/New_York'
    );
    expect(req.type).toBe(EventType.GOAL);
    expect(req.team).toBe(TeamSide.US);
    expect(req.message).toBe('Mason to Jake');
    expect(req.defensivePlay).toBe('block');
    expect(req.timestamp).toBe(Date.UTC(2026, 2, 22, 14, 16, 0));
  });

  it('attaches game-level startingOnOffense to the game_start event', () => {
    const req = toAddEventRequest({ time: '10:04', type: EventType.GAME_START }, game, 'America/New_York');
    expect(req.startingOnOffense).toBe(true);
  });

  it('does not attach startingOnOffense to non-start events', () => {
    const req = toAddEventRequest({ time: '10:04', type: EventType.GOAL, team: 'them' }, game, 'America/New_York');
    expect(req.startingOnOffense).toBeUndefined();
  });

  it('lets an explicit event-level startingOnOffense override', () => {
    const req = toAddEventRequest(
      { time: '10:04', type: EventType.GAME_START, startingOnOffense: false },
      game,
      'America/New_York'
    );
    expect(req.startingOnOffense).toBe(false);
  });
});

interface RecordedCall {
  url: string;
  method: string;
  body: any;
}

function makeFetchStub() {
  const calls: RecordedCall[] = [];
  let counter = 0;
  const jsonResponse = (data: unknown) =>
    ({
      ok: true,
      status: 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
    }) as unknown as Response;

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url, method, body });
    if (method === 'POST' && /\/games$/.test(url)) {
      counter += 1;
      return jsonResponse({ game: { id: `game_test_${counter}` } });
    }
    return jsonResponse({ game: {} });
  }) as unknown as typeof globalThis.fetch;

  return { fetchImpl, calls };
}

describe('loadTournament — HTTP mapping', () => {
  const apiUrl = 'https://api.example.test';

  it('creates a game, then adds events in order', async () => {
    const { fetchImpl, calls } = makeFetchStub();
    const spec: TournamentSpec = {
      tournament: 'Test Cup',
      timezone: 'America/New_York',
      games: [
        {
          date: '2026-03-22',
          ourTeam: 'Tech Support',
          opponent: 'Haverford',
          startingOnOffense: true,
          gameOrder: 1,
          events: [
            { time: '10:04', type: EventType.GAME_START },
            { time: '10:13', type: EventType.GOAL, team: 'us', message: 'Jake to Nico' },
            { time: '10:23', type: EventType.GOAL, team: 'them', message: '1-1' },
            { time: '11:37', type: EventType.GAME_END },
          ],
        },
      ],
    };

    const ids = await loadTournament(spec, { apiUrl, fetch: fetchImpl, log: () => {} });

    expect(ids).toEqual(['game_test_1']);

    // create, then 4 events
    expect(calls).toHaveLength(5);

    const create = calls[0];
    expect(create.method).toBe('POST');
    expect(create.url).toBe(`${apiUrl}/games`);
    expect(create.body).toEqual({
      chatId: 'test-cup-2026-03-22-game1',
      ourTeamName: 'Tech Support',
      opponentName: 'Haverford',
      tournamentName: 'Test Cup',
      gameDate: '2026-03-22',
      gameOrder: 1,
    });

    // Events target the created id, in order.
    for (let i = 1; i <= 4; i++) {
      expect(calls[i].method).toBe('POST');
      expect(calls[i].url).toBe(`${apiUrl}/games/game_test_1/events`);
    }
    expect(calls[1].body.type).toBe(EventType.GAME_START);
    expect(calls[1].body.startingOnOffense).toBe(true);
    expect(calls[1].body.timestamp).toBe(Date.UTC(2026, 2, 22, 14, 4, 0));
    expect(calls[2].body).toMatchObject({ type: EventType.GOAL, team: TeamSide.US, message: 'Jake to Nico' });
    expect(calls[3].body).toMatchObject({ type: EventType.GOAL, team: TeamSide.THEM });
    expect(calls[4].body.type).toBe(EventType.GAME_END);
  });

  it('PATCHes videoUrl after events when present', async () => {
    const { fetchImpl, calls } = makeFetchStub();
    const spec: TournamentSpec = {
      tournament: 'Video Cup',
      games: [
        {
          date: '2026-07-15',
          ourTeam: 'A',
          opponent: 'B',
          videoUrl: 'https://youtu.be/abc',
          events: [{ time: '09:00', type: EventType.GOAL, team: 'us' }],
        },
      ],
    };

    await loadTournament(spec, { apiUrl, fetch: fetchImpl, log: () => {} });

    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch).toBeDefined();
    expect(patch!.url).toBe(`${apiUrl}/games/game_test_1`);
    expect(patch!.body).toEqual({ videoUrl: 'https://youtu.be/abc' });
  });

  it('replace mode deletes the existing game before creating', async () => {
    const { fetchImpl, calls } = makeFetchStub();
    const spec: TournamentSpec = {
      tournament: 'Fix Cup',
      games: [
        {
          date: '2026-07-15',
          ourTeam: 'A',
          opponent: 'B',
          existingGameId: 'game_old_123',
          events: [{ time: '09:00', type: EventType.GOAL, team: 'us' }],
        },
      ],
    };

    await loadTournament(spec, { apiUrl, fetch: fetchImpl, log: () => {} });

    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].url).toBe(`${apiUrl}/games/game_old_123`);
    expect(calls[1].method).toBe('POST');
    expect(calls[1].url).toBe(`${apiUrl}/games`);
  });

  it('uses an explicit chatId when provided', async () => {
    const { fetchImpl, calls } = makeFetchStub();
    const spec: TournamentSpec = {
      tournament: 'Chat Cup',
      games: [
        {
          date: '2026-07-15',
          ourTeam: 'A',
          opponent: 'B',
          chatId: 'my-custom-chat',
          events: [{ time: '09:00', type: EventType.GOAL, team: 'us' }],
        },
      ],
    };

    await loadTournament(spec, { apiUrl, fetch: fetchImpl, log: () => {} });
    expect(calls[0].body.chatId).toBe('my-custom-chat');
  });
});
