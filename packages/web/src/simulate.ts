/**
 * Simulate page: matchup previews and what-if scenario recomputes.
 * Runs the @scorebot/rankings engine client-side on the fixture dataset.
 */
import {
  HS_2025_V1,
  computePoolStandings,
  datasetToNormalized,
  orderAcrossPools,
  parseCanonicalDataset,
  prefillScore,
  previewMatchup,
  runScenario,
  type HypotheticalGame,
  type PoolGameResult,
  type PoolTeam,
} from '@scorebot/rankings';
import type { CanonicalDataset, Snapshot } from '@scorebot/rankings';
import fixtureSnapshot from './rankings/snapshot-boys-fixture.json';
import fixtureDataset from './simulate/small-season.json';
import {
  divisionFromSearch,
  loadDivision,
  type Division,
  type LoadedData,
} from './snapshotLoader.js';

const fixture = {
  snapshot: fixtureSnapshot as unknown as Snapshot,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataset: fixtureDataset as any as CanonicalDataset,
};

let snapshot: Snapshot = fixture.snapshot;
let dataset: CanonicalDataset = fixture.dataset;
let baseGames = datasetToNormalized(dataset, HS_2025_V1).games;
let teamIds: string[] = [];
let names = new Map<string, string>();
let ratings = new Map<string, number>();
let orderedIds: string[] = [];
let rankedIds: string[] = [];
let poolASeed: string[] = [];
let poolBSeed: string[] = [];
let hypotheticals: HypotheticalGame[] = [];
let hypoN = 0;
let realData = false;
let division: Division = 'boys';

function rebuildData(): void {
  const parsed = parseCanonicalDataset(dataset);
  dataset = parsed.dataset;
  baseGames = datasetToNormalized(dataset, HS_2025_V1).games;
  teamIds = dataset.teams.map((t) => t.id);
  names = new Map(dataset.teams.map((t) => [t.id, t.displayName] as const));
  ratings = new Map(snapshot.teams.map((t) => [t.id, t.rating] as const));
  orderedIds = [...teamIds].sort((a, b) => (ratings.get(b) ?? 0) - (ratings.get(a) ?? 0));
  rankedIds = snapshot.teams.filter((t) => t.rank != null).slice(0, 6).map((t) => t.id);
  poolASeed = [rankedIds[0], rankedIds[3], rankedIds[4]].filter(Boolean);
  poolBSeed = [rankedIds[1], rankedIds[2], rankedIds[5]].filter(Boolean);
}

function fillSelect(sel: HTMLSelectElement): void {
  sel.innerHTML = '';
  for (const id of orderedIds) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = names.get(id) ?? id;
    sel.appendChild(opt);
  }
}

function renderMatchup(): void {
  const a = (document.getElementById('matchup-a') as HTMLSelectElement).value;
  const b = (document.getElementById('matchup-b') as HTMLSelectElement).value;
  const cap = parseInt((document.getElementById('cap-select') as HTMLSelectElement).value, 10);
  const el = document.getElementById('matchup-result')!;
  el.innerHTML = '';
  if (a === b) {
    el.textContent = 'Pick two different teams.';
    return;
  }
  const m = previewMatchup(a, b, ratings.get(a) ?? 1000, ratings.get(b) ?? 1000, { cap });
  const fav = m.favoriteId ? names.get(m.favoriteId) : 'Even';
  const pct = (m.winProbA >= 0.5 ? m.winProbA : 1 - m.winProbA) * 100;
  const winnerName = names.get(m.displayScore.winner);
  el.innerHTML =
    `<strong>${fav}</strong> favored — ${pct.toFixed(0)}% to win · ` +
    `projected ${m.displayScore.winnerGoals}–${m.displayScore.loserGoals} to ${winnerName}`;
}

function renderScenario(): void {
  const err = document.getElementById('scenario-error')!;
  const list = document.getElementById('hypo-list')!;
  const body = document.getElementById('scenario-results') as HTMLElement;
  const note = document.getElementById('scenario-note')!;
  err.textContent = '';
  list.innerHTML = '';
  body.innerHTML = '';

  hypotheticals.forEach((h, i) => {
    const li = document.createElement('li');
    li.textContent = `${names.get(h.winnerId)} ${h.w}-${h.l} ${names.get(h.loserId)} `;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.textContent = '✕';
    rm.setAttribute('aria-label', 'Remove hypothetical');
    rm.addEventListener('click', () => {
      hypotheticals = hypotheticals.filter((_, j) => j !== i);
      renderScenario();
    });
    li.appendChild(rm);
    list.appendChild(li);
  });

  try {
    const r = runScenario(baseGames, hypotheticals, HS_2025_V1, teamIds);
    for (const d of r.deltas) {
      const tr = document.createElement('tr');
      const cells = [
        names.get(d.teamId) ?? d.teamId,
        d.baseRating.toFixed(1),
        d.scenarioRating.toFixed(1),
        (d.delta >= 0 ? '+' : '') + d.delta.toFixed(1),
        d.baseRank == null ? '—' : String(d.baseRank),
        d.scenarioRank == null ? '—' : String(d.scenarioRank),
      ];
      cells.forEach((c, j) => {
        const td = document.createElement('td');
        td.textContent = String(c);
        if (j > 0) td.className = 'num';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    }
    note.textContent =
      hypotheticals.length === 0
        ? 'No hypothetical results — baseline shown. Add a result above.'
        : `Re-anchored by median shift of uninvolved teams (${r.anchorShift.toFixed(1)}).`;
  } catch (e) {
    err.textContent = e instanceof Error ? e.message : 'Scenario failed.';
  }
}

// ---- wiring (bound once; initSimulate rebuilds data-bound state) ----
for (const id of ['matchup-a', 'matchup-b', 'cap-select']) {
  document.getElementById(id)!.addEventListener('change', renderMatchup);
}

for (const id of ['matchup-a', 'matchup-b', 'cap-select']) {
  document.getElementById(id)!.addEventListener('change', renderMatchup);
}
document.getElementById('hypo-add')!.addEventListener('click', () => {
  const err = document.getElementById('scenario-error')!;
  const winnerId = (document.getElementById('hypo-winner') as HTMLSelectElement).value;
  const loserId = (document.getElementById('hypo-loser') as HTMLSelectElement).value;
  const w = parseInt((document.getElementById('hypo-w') as HTMLInputElement).value, 10);
  const l = parseInt((document.getElementById('hypo-l') as HTMLInputElement).value, 10);
  if (winnerId === loserId) {
    err.textContent = 'Winner and loser must be different teams.';
    return;
  }
  if (!Number.isInteger(w) || !Number.isInteger(l) || w < 0 || l < 0 || w === l) {
    err.textContent = 'Enter two different non-negative scores (ties excluded).';
    return;
  }
  const winnerScore = Math.max(w, l);
  const loserScore = Math.min(w, l);
  hypotheticals = [...hypotheticals, { id: `hypo-${++hypoN}`, winnerId, loserId, w: winnerScore, l: loserScore }];
  renderScenario();
});
document.getElementById('scenario-reset')!.addEventListener('click', () => {
  hypotheticals = [];
  renderScenario();
});

function renderDivisionSegment(): void {
  document.querySelectorAll<HTMLButtonElement>('.rk-seg[data-division]').forEach((btn) => {
    btn.classList.toggle('rk-seg-active', btn.dataset.division === division);
  });
}

function renderSubtitle(): void {
  const m = snapshot.meta;
  const divLabel = m.division === 'boys' ? 'High School Boys' : m.division === 'girls' ? 'High School Girls' : m.division;
  document.getElementById('sim-division')!.textContent = `${divLabel} · ${m.season}`;
  document.getElementById('sim-pill')!.textContent = realData ? 'Final' : 'Demo data';
}

async function initSimulate(next: Division): Promise<void> {
  division = next;
  const loaded: LoadedData = await loadDivision(next, fetch, fixture);
  snapshot = loaded.snapshot;
  dataset = loaded.dataset;
  realData = loaded.real;
  rebuildData();
  hypotheticals = [];
  poolScores.clear();
  koScores.clear();
  lastKoKey = '';
  lastFinalKey = '';
  for (const id of ['matchup-a', 'matchup-b', 'hypo-winner', 'hypo-loser']) {
    fillSelect(document.getElementById(id) as HTMLSelectElement);
  }
  const setDefault = (id: string, i: number) => {
    (document.getElementById(id) as HTMLSelectElement).value = orderedIds[i] ?? '';
  };
  setDefault('matchup-a', 0);
  setDefault('matchup-b', 1);
  setDefault('hypo-winner', 0);
  setDefault('hypo-loser', 1);
  const url = new URL(window.location.href);
  url.searchParams.set('division', next);
  window.history.replaceState({}, '', url.toString());
  renderDivisionSegment();
  renderSubtitle();
  renderMatchup();
  renderScenario();
  seedPoolScores(poolASeed);
  seedPoolScores(poolBSeed);
  renderPoolGames();
  recomputeTournament();
}

document.querySelectorAll<HTMLButtonElement>('.rk-seg[data-division]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.division === 'boys' || btn.dataset.division === 'girls') {
      void initSimulate(btn.dataset.division);
    }
  });
});

void initSimulate(divisionFromSearch(window.location.search));

// ---- tournament simulation: serpentine pools + knockout ----

function poolTeams(ids: string[]): PoolTeam[] {
  return ids.map((id) => ({
    id,
    rating: ratings.get(id) ?? 1000,
    seed: rankedIds.indexOf(id) + 1,
  }));
}

const poolScores = new Map<string, { a: number; b: number }>();
const koScores = new Map<string, { a: number; b: number }>();
let lastKoKey = '';

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('~');
}

function seedPoolScores(ids: string[]): void {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      // prefillScore is already oriented: aScore belongs to ids[i].
      const p = prefillScore(ratings.get(ids[i]) ?? 1000, ratings.get(ids[j]) ?? 1000);
      poolScores.set(pairKey(ids[i], ids[j]), { a: p.aScore, b: p.bScore });
    }
  }
}

function poolResults(ids: string[]): PoolGameResult[] {
  const out: PoolGameResult[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const s = poolScores.get(pairKey(ids[i], ids[j]))!;
      out.push({ aId: ids[i], bId: ids[j], aScore: s.a, bScore: s.b, simulated: true });
    }
  }
  return out;
}

function gameRowHTML(aId: string, bId: string, s: { a: number; b: number }): string {
  return (
    `<td class="tourney-team-a">${names.get(aId)}</td>` +
    `<td><input class="sim-score rk-input" type="number" min="0" data-team="${aId}" value="${s.a}" aria-label="${names.get(aId)} score" /></td>` +
    `<td>–</td>` +
    `<td><input class="sim-score rk-input" type="number" min="0" data-team="${bId}" value="${s.b}" aria-label="${names.get(bId)} score" /></td>` +
    `<td class="tourney-team-b">${names.get(bId)}</td>`
  );
}

function renderPoolGames(): void {
  for (const [pool, ids] of [['a', poolASeed], ['b', poolBSeed]] as const) {
    const body = document.getElementById(`pool-${pool}-games`)!;
    body.innerHTML = '';
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const s = poolScores.get(pairKey(ids[i], ids[j]))!;
        const tr = document.createElement('tr');
        tr.innerHTML = gameRowHTML(ids[i], ids[j], s);
        const [inA, inB] = tr.querySelectorAll('input');
        inA.addEventListener('input', () => {
          poolScores.set(pairKey(ids[i], ids[j]), {
            a: parseInt(inA.value, 10) || 0,
            b: parseInt(inB.value, 10) || 0,
          });
          recomputeTournament();
        });
        inB.addEventListener('input', () => {
          poolScores.set(pairKey(ids[i], ids[j]), {
            a: parseInt(inA.value, 10) || 0,
            b: parseInt(inB.value, 10) || 0,
          });
          recomputeTournament();
        });
        body.appendChild(tr);
      }
    }
  }
}

function koScore(a: string, b: string): { a: number; b: number } {
  const key = pairKey(a, b);
  let s = koScores.get(key);
  if (!s) {
    const p = prefillScore(ratings.get(a) ?? 1000, ratings.get(b) ?? 1000);
    s = (ratings.get(a) ?? 0) >= (ratings.get(b) ?? 0)
      ? { a: p.aScore, b: p.bScore }
      : { a: p.bScore, b: p.aScore };
    koScores.set(key, s);
  }
  return s;
}

function renderKoTie(id: string, label: string, a: string, b: string): void {
  const div = document.getElementById(id)!;
  const s = koScore(a, b);
  div.innerHTML =
    `<span>${label}: ${names.get(a)} vs ${names.get(b)}</span><br/>` + gameRowHTML(a, b, s);
  const [inA, inB] = div.querySelectorAll('input');
  const update = () => {
    koScores.set(pairKey(a, b), { a: parseInt(inA.value, 10) || 0, b: parseInt(inB.value, 10) || 0 });
    recomputeFinal();
  };
  inA.addEventListener('input', update);
  inB.addEventListener('input', update);
}

function koWinner(a: string, b: string): string | null {
  const s = koScores.get(pairKey(a, b));
  if (!s || s.a === s.b) return null;
  return s.a > s.b ? a : b;
}

let lastFinalKey = '';

function recomputeFinal(): void {
  const champ = document.getElementById('champion')!;
  const sf1w = koWinner(
    (document.getElementById('ko-sf1') as HTMLElement).dataset.a!,
    (document.getElementById('ko-sf1') as HTMLElement).dataset.b!,
  );
  const sf2w = koWinner(
    (document.getElementById('ko-sf2') as HTMLElement).dataset.a!,
    (document.getElementById('ko-sf2') as HTMLElement).dataset.b!,
  );
  if (!sf1w || !sf2w) {
    champ.textContent = 'Settle both semifinals to reach the final.';
    return;
  }
  // Only re-render final inputs when the pairing changes, so typing keeps focus.
  const fkey = pairKey(sf1w, sf2w);
  if (fkey !== lastFinalKey) {
    lastFinalKey = fkey;
    if (!koScores.get(fkey)) {
      // prefillScore is oriented: aScore belongs to sf1w, bScore to sf2w.
      const p = prefillScore(ratings.get(sf1w) ?? 1000, ratings.get(sf2w) ?? 1000);
      koScores.set(fkey, { a: p.aScore, b: p.bScore });
    }
    renderKoTie('ko-final', 'Final', sf1w, sf2w);
  }
  const fw = koWinner(sf1w, sf2w);
  champ.textContent = fw ? `Champion: ${names.get(fw)}` : 'Final is tied — edit scores to decide.';
}

function recomputeTournament(): void {
  const sta = computePoolStandings(poolTeams(poolASeed), poolResults(poolASeed));
  const stb = computePoolStandings(poolTeams(poolBSeed), poolResults(poolBSeed));
  for (const [pool, st, ids] of [['a', sta, poolASeed], ['b', stb, poolBSeed]] as const) {
    const body = document.getElementById(`pool-${pool}-standings`)!;
    body.innerHTML = '';
    st.forEach((s, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${names.get(s.teamId)}</td><td class="num">${s.wins}–${ids.length - 1 - s.wins}</td><td class="num">${s.pointDiff > 0 ? '+' : ''}${s.pointDiff}</td>`;
      body.appendChild(tr);
    });
  }
  const cross = orderAcrossPools([sta, stb]);
  const ol = document.getElementById('cross-pool')!;
  ol.innerHTML = '';
  cross.forEach((id, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${names.get(id)}`;
    ol.appendChild(li);
  });

  const key = `${sta[0]?.teamId}>${stb[1]?.teamId}|${stb[0]?.teamId}>${sta[1]?.teamId}`;
  if (key !== lastKoKey) {
    lastKoKey = key;
    const sf1 = document.getElementById('ko-sf1') as HTMLElement;
    const sf2 = document.getElementById('ko-sf2') as HTMLElement;
    sf1.dataset.a = sta[0]?.teamId ?? '';
    sf1.dataset.b = stb[1]?.teamId ?? '';
    sf2.dataset.a = stb[0]?.teamId ?? '';
    sf2.dataset.b = sta[1]?.teamId ?? '';
    if (sta[0] && stb[1]) renderKoTie('ko-sf1', 'Semifinal 1', sta[0].teamId, stb[1].teamId);
    if (stb[0] && sta[1]) renderKoTie('ko-sf2', 'Semifinal 2', stb[0].teamId, sta[1].teamId);
  }
  recomputeFinal();
}
