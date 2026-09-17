/**
 * Runtime division loader. Published snapshots live next to the legacy
 * exports in public/rankings/ (gitignored, generated before deploy); when
 * they are absent or invalid (local dev without a Drive pull, CI builds),
 * pages fall back to the committed fixture so they always render.
 */
import type { CanonicalDataset, Snapshot } from '@scorebot/rankings';

export type Division = 'boys' | 'girls';

export interface FixturePair {
  snapshot: Snapshot;
  dataset: CanonicalDataset;
}

export interface LoadedData {
  division: Division;
  snapshot: Snapshot;
  dataset: CanonicalDataset;
  /** false when serving the fixture fallback instead of published data. */
  real: boolean;
}

export function divisionFromSearch(search: string): Division {
  return new URLSearchParams(search).get('division') === 'girls' ? 'girls' : 'boys';
}

function validSnapshot(x: unknown): x is Snapshot {
  const s = x as Partial<Snapshot>;
  return !!s && typeof s === 'object' && typeof s.meta?.rulesetVersion === 'string' && Array.isArray(s.teams);
}

export async function loadDivision(
  division: Division,
  fetchFn: (url: string) => Promise<Response> = fetch,
  fixture: FixturePair,
): Promise<LoadedData> {
  try {
    const [snapRes, dataRes] = await Promise.all([
      fetchFn(`/rankings/snapshot-${division}.json`),
      fetchFn(`/rankings/dataset-${division}.json`),
    ]);
    if (!snapRes.ok || !dataRes.ok) throw new Error(`snapshot files missing for ${division}`);
    const snapshot: unknown = await snapRes.json();
    const dataset: unknown = await dataRes.json();
    if (!validSnapshot(snapshot)) throw new Error(`invalid snapshot shape for ${division}`);
    return { division, snapshot, dataset: dataset as CanonicalDataset, real: true };
  } catch {
    return { division, snapshot: fixture.snapshot, dataset: fixture.dataset, real: false };
  }
}
