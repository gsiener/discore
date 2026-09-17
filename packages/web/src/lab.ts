/**
 * Lab page: experimental alternate rating rules. Outputs are labeled
 * experimental and never feed back into published rankings.
 */
import {
  HS_2025_V1,
  alwaysTrue,
  datasetToNormalized,
  parseCanonicalDataset,
  runRatings,
  runWithBlowoutConfig,
  standardMargin,
  topKPostHoc,
} from '@scorebot/rankings';
import fixtureDataset from './simulate/small-season.json';
import fixtureSnapshot from './rankings/snapshot-boys-fixture.json';
import type { CanonicalDataset, RatingsResult, Snapshot } from '@scorebot/rankings';
import {
  divisionFromSearch,
  loadDivision,
  type Division,
} from './snapshotLoader.js';

const fixture = {
  snapshot: fixtureSnapshot as unknown as Snapshot,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataset: fixtureDataset as any as CanonicalDataset,
};

let dataset: CanonicalDataset = fixture.dataset;
let baseGames = datasetToNormalized(dataset, HS_2025_V1).games;
let names = new Map<string, string>();
let base: RatingsResult = runRatings(baseGames, HS_2025_V1);
let realData = false;
let division: Division = 'boys';

function rebuildData(): void {
  const parsed = parseCanonicalDataset(dataset);
  dataset = parsed.dataset;
  baseGames = datasetToNormalized(dataset, HS_2025_V1).games;
  names = new Map(dataset.teams.map((t) => [t.id, t.displayName] as const));
  base = runRatings(baseGames, HS_2025_V1);
}

function renderSubtitle(): void {
  const label = division === 'boys' ? 'High School Boys' : 'High School Girls';
  document.getElementById('lab-division')!.textContent = `${label} · ${dataset.season}`;
  document.getElementById('lab-pill')!.textContent = realData ? 'Final' : 'Demo data';
}

function renderDivisionSegment(): void {
  document.querySelectorAll<HTMLButtonElement>('.rk-seg[data-division]').forEach((btn) => {
    btn.classList.toggle('rk-seg-active', btn.dataset.division === division);
  });
}

async function initLab(next: Division): Promise<void> {
  division = next;
  const loaded = await loadDivision(next, fetch, fixture);
  dataset = loaded.dataset;
  realData = loaded.real;
  rebuildData();
  const url = new URL(window.location.href);
  url.searchParams.set('division', next);
  window.history.replaceState({}, '', url.toString());
  renderDivisionSegment();
  renderSubtitle();
  runTopK();
  runBlowout();
}

document.querySelectorAll<HTMLButtonElement>('.rk-seg[data-division]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.division === 'boys' || btn.dataset.division === 'girls') {
      void initLab(btn.dataset.division);
    }
  });
});

void initLab(divisionFromSearch(window.location.search));

function runTopK(): void {
  const k = Math.max(1, parseInt((document.getElementById('topk-k') as HTMLInputElement).value, 10) || 1);
  const out = topKPostHoc(base, k);
  const rows = [...out.values()].sort((a, b) => b.rating - a.rating);
  const body = document.getElementById('topk-results')!;
  body.innerHTML = '';
  for (const r of rows) {
    const std = base.teams.get(r.teamId)?.rating ?? 0;
    const tr = document.createElement('tr');
    const cells = [names.get(r.teamId) ?? r.teamId, std.toFixed(1), r.rating.toFixed(1), String(r.kept)];
    cells.forEach((c, j) => {
      const td = document.createElement('td');
      td.textContent = String(c);
      if (j > 0) td.className = 'num';
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

function runBlowout(): void {
  const gap = Math.max(0, parseInt((document.getElementById('bl-gap') as HTMLInputElement).value, 10) || 0);
  const margin = (document.getElementById('bl-margin') as HTMLSelectElement).value === 'any' ? alwaysTrue : standardMargin;
  const oneSided = (document.getElementById('bl-onesided') as HTMLInputElement).checked;
  const res = runWithBlowoutConfig(baseGames, HS_2025_V1, { gap, marginFn: margin, oneSided });
  document.getElementById('bl-summary')!.textContent =
    `${res.ignoredGameIds.size} games ignored (gap ${gap}, ${oneSided ? 'one-sided' : 'two-sided'}) · ` +
    `converged=${res.converged} in ${res.iterations} iterations`;
  const rows = [...res.teams.values()].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const body = document.getElementById('bl-results')!;
  body.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    const cells = [names.get(r.teamId) ?? r.teamId, r.rating.toFixed(1), String(r.gamesUsed)];
    cells.forEach((c, j) => {
      const td = document.createElement('td');
      td.textContent = String(c);
      if (j > 0) td.className = 'num';
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

document.getElementById('topk-run')!.addEventListener('click', runTopK);
document.getElementById('bl-run')!.addEventListener('click', runBlowout);
