import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SEASON, divisionFromSearch, loadDivision, seasonFromSearch } from './snapshotLoader.js';

const snap = { meta: { rulesetVersion: 'HS_2025_V1' }, teams: [{ id: 'a' }] };
const data = { season: '2025-26', division: 'boys', teams: [], games: [], events: {} };
const fixture = { snapshot: { meta: {}, teams: [] }, dataset: data };

function ok(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

function fail(): Response {
  return { ok: false, json: async () => null } as Response;
}

describe('divisionFromSearch', () => {
  it('reads ?division=, defaults to boys', () => {
    expect(divisionFromSearch('?division=girls')).toBe('girls');
    expect(divisionFromSearch('?division=boys')).toBe('boys');
    expect(divisionFromSearch('')).toBe('boys');
    expect(divisionFromSearch('?division=other')).toBe('boys');
  });
});

describe('seasonFromSearch', () => {
  it('reads ?season=, defaults to the current season', () => {
    expect(DEFAULT_SEASON).toBe('2026-27');
    expect(seasonFromSearch('?season=2025-26')).toBe('2025-26');
    expect(seasonFromSearch('?season=2026-27')).toBe('2026-27');
    expect(seasonFromSearch('')).toBe('2026-27');
    expect(seasonFromSearch('?season=other')).toBe('2026-27');
  });
});

describe('loadDivision', () => {
  it('loads real snapshot + dataset when both fetch', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('snapshot-') ? ok(snap) : ok(data),
    );
    const loaded = await loadDivision('boys', fetchFn, fixture as never);
    expect(loaded.real).toBe(true);
    expect(loaded.snapshot).toEqual(snap);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('fetches season-prefixed snapshot paths', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('snapshot-') ? ok(snap) : ok(data),
    );
    const loaded = await loadDivision('boys', fetchFn, fixture as never, '2025-26');
    expect(loaded.real).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith('/rankings/2025-26/snapshot-boys.json');
    expect(fetchFn).toHaveBeenCalledWith('/rankings/2025-26/dataset-boys.json');
  });

  it('falls back to fixture when snapshot is missing', async () => {
    const loaded = await loadDivision('girls', async () => fail(), fixture as never);
    expect(loaded.real).toBe(false);
    expect(loaded.snapshot).toBe(fixture.snapshot);
  });

  it('falls back to fixture when snapshot shape is invalid', async () => {
    const loaded = await loadDivision('boys', async () => ok({ nope: 1 }), fixture as never);
    expect(loaded.real).toBe(false);
  });

  it('falls back to fixture when fetch throws', async () => {
    const loaded = await loadDivision('boys', async () => {
      throw new Error('no network');
    }, fixture as never);
    expect(loaded.real).toBe(false);
  });
});
