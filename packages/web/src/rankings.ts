/**
 * Rankings page: standings table, connectivity view, and team detail
 * rendered from a published @scorebot/rankings snapshot.
 */
import type { Snapshot, SnapshotTeam } from '@scorebot/rankings';
import {
  filterTeams,
  regionAbbrev,
  regionSeed,
  sortTeams,
  sparkColor,
  sparkPoints,
  statusLabel,
  type RankRow,
} from './rankings-logic.js';
// Published snapshots load at runtime; the fixture stands in when they are
// absent (local dev without a Drive pull, CI builds).
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
  dataset: fixtureDataset as any,
};

let snapshot: Snapshot = fixture.snapshot;
let realData = false;
let division: Division = 'boys';
// True when the requested division has no published snapshot AND the fixture
// is not that division (fixture is boys) — render an honest empty state.
let divisionEmpty = false;

interface State {
  query: string;
  region: string;
  hideProvisional: boolean;
  sortDir: 'asc' | 'desc';
  view: 'standings' | 'connectivity' | 'team';
  teamId: string | null;
}

const state: State = {
  query: '',
  region: 'all',
  hideProvisional: false,
  sortDir: 'asc',
  view: 'standings',
  teamId: null,
};

let rows: RankRow[] = [];
let byId = new Map<string, SnapshotTeam>();

function rebuildIndex(): void {
  rows = snapshot.teams.map((t) => ({
    id: t.id,
    name: t.name,
    rank: t.rank,
    rating: t.rating,
    qualified: t.qualified,
    region: t.region,
    gamesPlayed: t.gamesPlayed,
  }));
  byId = new Map(snapshot.teams.map((t) => [t.id, t]));
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function currentRows(): RankRow[] {
  return sortTeams(
    filterTeams(rows, { query: state.query, region: state.region, hideProvisional: state.hideProvisional }),
    state.sortDir,
  );
}

function renderMeta(): void {
  const m = snapshot.meta;
  const divLabel = m.division === 'boys' ? 'High School Boys' : m.division === 'girls' ? 'High School Girls' : m.division;
  document.getElementById('rk-division')!.textContent = `${divLabel} · ${m.season}`;
  // Published snapshots reflect a finished season; the fixture is demo data.
  const pill = document.getElementById('rk-snapshot-pill');
  if (pill) pill.textContent = realData ? 'Final' : divisionEmpty ? 'No data' : 'Demo data';
  const meta = document.getElementById('rk-meta')!;
  meta.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = realData ? 'Final' : 'Snapshot';
  meta.appendChild(strong);
  meta.append(
    ` · ${snapshot.teams.length} teams · ${m.totalGames} games · final results through ${fmtDate(m.resultsThrough)} · updated ${fmtDate(m.generatedAt)}`,
  );
}

function renderRegionOptions(): void {
  const sel = document.getElementById('region-filter') as HTMLSelectElement;
  sel.innerHTML = '<option value="all">All regions</option>';
  const regions = [...new Set(rows.map((r) => r.region).filter((x): x is string => !!x))].sort();
  for (const r of regions) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  }
  sel.value = 'all';
  state.region = 'all';
}

function renderDivisionSegment(): void {
  document.querySelectorAll<HTMLButtonElement>('.rk-seg[data-division]').forEach((btn) => {
    btn.classList.toggle('rk-seg-active', btn.dataset.division === division);
  });
}

async function setDivision(next: Division): Promise<void> {
  division = next;
  const loaded: LoadedData = await loadDivision(next, fetch, fixture);
  snapshot = loaded.snapshot;
  realData = loaded.real;
  divisionEmpty = !loaded.real && next !== 'boys';
  rebuildIndex();
  state.query = '';
  state.region = 'all';
  state.view = 'standings';
  (document.getElementById('header-search') as HTMLInputElement).value = '';
  (document.getElementById('find-team') as HTMLInputElement).value = '';
  const url = new URL(window.location.href);
  url.searchParams.set('division', next);
  window.history.replaceState({}, '', url.toString());
  renderDivisionSegment();
  renderMeta();
  renderRegionOptions();
  setView('standings');
  renderTable();
}

function sparkSvg(t: SnapshotTeam): string {
  const effects = [...t.games]
    .sort((a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId))
    .map((g) => g.effect);
  const pts = sparkPoints(effects, 72, 24);
  if (!pts) return '<span class="rk-muted">—</span>';
  const color = sparkColor(effects);
  const stroke = color === 'up' ? '#22c55e' : color === 'down' ? '#ef4444' : '#9ca3af';
  const fill = color === 'up' ? 'rgba(34,197,94,0.15)' : color === 'down' ? 'rgba(239,68,68,0.15)' : 'rgba(156,163,175,0.15)';
  return (
    `<svg width="72" height="24" viewBox="0 0 72 24" aria-hidden="true">` +
    `<polygon points="0,24 ${pts} 72,24" fill="${fill}"/>` +
    `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/></svg>`
  );
}

function confClass(t: SnapshotTeam): string {
  return t.confidence === 'high' ? 'rk-conf-high' : t.confidence === 'med' ? 'rk-conf-med' : 'rk-conf-low';
}

function renderTable(): void {
  const body = document.getElementById('rankings-body')!;
  body.innerHTML = '';
  if (divisionEmpty) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '11');
    td.textContent = 'No published snapshot for this division yet.';
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const r of currentRows()) {
    const t = byId.get(r.id)!;
    const tr = document.createElement('tr');
    tr.dataset.team = t.id;

    const rankTd = document.createElement('td');
    rankTd.innerHTML = `<span class="rk-rank">${t.rank ?? '—'}</span>`;

    const teamTd = document.createElement('td');
    const seed = regionSeed(rows, t.id);
    teamTd.innerHTML =
      `<span class="rk-teamcell"><span class="rk-avatar">${t.name.charAt(0)}</span>` +
      `<span class="rk-teamname">${t.name}</span>` +
      (t.region && seed ? `<span class="rk-seed">${regionAbbrev(t.region)} ${seed}</span>` : '') +
      `</span>`;

    const statusTd = document.createElement('td');
    const label = statusLabel(r);
    statusTd.innerHTML = `<span class="rk-status${label === 'Ranked' ? '' : ' rk-status-prov'}">${label}</span>`;

    const ratingTd = document.createElement('td');
    ratingTd.innerHTML =
      `<span class="rk-rating-badge">${Math.round(t.rating)}</span>` +
      (t.sd == null ? '' : `<span class="rk-sd" title="Per-game rating variability (shrunk toward pooled variance)">±${t.sd.toFixed(1)}</span>`);

    const deltaTd = document.createElement('td');
    deltaTd.innerHTML = `<span class="rk-delta" title="Rank movement needs a prior snapshot">—</span>`;

    const trendTd = document.createElement('td');
    trendTd.innerHTML = sparkSvg(t);

    const recordTd = document.createElement('td');
    recordTd.className = 'num';
    recordTd.innerHTML = `<span class="rk-record">${t.wins}–${t.losses}</span>`;

    const regionTd = document.createElement('td');
    regionTd.innerHTML = t.region ? `<span class="rk-region">${t.region}</span>` : '—';

    const sosTd = document.createElement('td');
    sosTd.innerHTML = `<span class="rk-sos-badge" title="Mean opponent rating, percentile ${t.sosPercentile}">${Math.round(t.sos)}</span>`;

    const gpTd = document.createElement('td');
    gpTd.textContent = String(t.gamesPlayed);

    const confTd = document.createElement('td');
    confTd.innerHTML = `<span class="rk-conf ${confClass(t)}">${t.confidence === 'med' ? 'Med' : t.confidence === 'high' ? 'High' : 'Low'}</span>`;

    tr.append(rankTd, teamTd, statusTd, ratingTd, deltaTd, trendTd, recordTd, regionTd, sosTd, gpTd, confTd);
    tr.addEventListener('click', () => showTeam(t.id));
    body.appendChild(tr);
  }
  document.getElementById('sort-arrow')!.textContent = state.sortDir === 'asc' ? '↑' : '↓';
}

function renderConnectivity(): void {
  const list = document.getElementById('components-list')!;
  list.innerHTML = '';
  const groups = new Map<number, SnapshotTeam[]>();
  for (const t of snapshot.teams) {
    const arr = groups.get(t.componentId) ?? [];
    arr.push(t);
    groups.set(t.componentId, arr);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  ordered.forEach(([id, members], i) => {
    const div = document.createElement('div');
    div.className = 'rk-component';
    const h3 = document.createElement('h3');
    h3.textContent = `Component ${i + 1} · ${members.length} team${members.length === 1 ? '' : 's'}`;
    div.appendChild(h3);
    if (members.length === 1) {
      const p = document.createElement('p');
      p.className = 'rk-meta';
      p.textContent = 'Isolated schedule: rating comparisons outside this group carry no shared evidence.';
      div.appendChild(p);
    }
    for (const m of [...members].sort((a, b) => b.rating - a.rating)) {
      const chip = document.createElement('span');
      chip.className = 'rk-chip';
      chip.textContent = `${m.name} (${Math.round(m.rating)})`;
      div.appendChild(chip);
    }
    void id;
    list.appendChild(div);
  });
}

function setView(view: State['view']): void {
  state.view = view;
  document.getElementById('standings-view')!.classList.toggle('hidden', view !== 'standings');
  document.getElementById('connectivity-view')!.classList.toggle('hidden', view !== 'connectivity');
  document.getElementById('team-view')!.classList.toggle('hidden', view !== 'team');
  const tabs = document.getElementById('tab-standings')!;
  const tabc = document.getElementById('tab-connectivity')!;
  tabs.classList.toggle('rk-viewtab-active', view === 'standings');
  tabc.classList.toggle('rk-viewtab-active', view === 'connectivity');
  tabs.setAttribute('aria-selected', String(view === 'standings'));
  tabc.setAttribute('aria-selected', String(view === 'connectivity'));
}

function showTeam(id: string): void {
  const t = byId.get(id);
  if (!t) return;
  state.teamId = id;
  setView('team');
  document.getElementById('team-name')!.textContent = t.name;
  document.getElementById('team-summary')!.textContent =
    `Rating ${t.rating.toFixed(1)} · ${t.wins}–${t.losses} (counted) · ` +
    `SoS ${t.sos.toFixed(0)} (p${t.sosPercentile}) · confidence ${t.confidence} · ${statusLabel(t)}`;
  const body = document.getElementById('team-games-body')!;
  body.innerHTML = '';
  for (const g of t.games) {
    const tr = document.createElement('tr');
    if (g.ignored) tr.classList.add('ignored');
    const cells = [
      g.opponentName,
      `${g.result} ${g.scoreFor}-${g.scoreAgainst}`,
      g.gameRating.toFixed(1),
      (g.effect >= 0 ? '+' : '') + g.effect.toFixed(1),
      `${g.scoreWeight.toFixed(2)}/${g.dateWeight.toFixed(2)}/${g.seriesMultiplier.toFixed(1)}`,
      g.ignored ? `ignored (${g.ignoreReason})` : 'counted',
    ];
    for (const c of cells) {
      const td = document.createElement('td');
      td.textContent = String(c);
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

function syncQuery(value: string, source: 'header' | 'find'): void {
  state.query = value;
  (document.getElementById('header-search') as HTMLInputElement).value = value;
  (document.getElementById('find-team') as HTMLInputElement).value = value;
  void source;
  if (state.view !== 'standings') setView('standings');
  renderTable();
}

function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  document.getElementById('theme-toggle')!.textContent = dark ? '☀' : '☾';
  try {
    localStorage.setItem('discore-rankings-theme', dark ? 'dark' : 'light');
  } catch {
    /* private mode: theme just won't persist */
  }
}

// ---- wiring ----
(document.getElementById('header-search') as HTMLInputElement).addEventListener('input', (e) => {
  syncQuery((e.target as HTMLInputElement).value, 'header');
});
(document.getElementById('find-team') as HTMLInputElement).addEventListener('input', (e) => {
  syncQuery((e.target as HTMLInputElement).value, 'find');
});
(document.getElementById('region-filter') as HTMLSelectElement).addEventListener('change', (e) => {
  state.region = (e.target as HTMLSelectElement).value;
  renderTable();
});
document.getElementById('hide-provisional')!.addEventListener('click', (e) => {
  state.hideProvisional = !state.hideProvisional;
  (e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(state.hideProvisional));
  renderTable();
});
document.getElementById('sort-rank')!.addEventListener('click', () => {
  state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  renderTable();
});
document.getElementById('tab-standings')!.addEventListener('click', () => setView('standings'));
document.getElementById('tab-connectivity')!.addEventListener('click', () => {
  setView('connectivity');
  renderConnectivity();
});
document.getElementById('back-link')!.addEventListener('click', (e) => {
  e.preventDefault();
  setView('standings');
});
document.getElementById('theme-toggle')!.addEventListener('click', () => {
  applyTheme(!document.documentElement.classList.contains('dark'));
});

let initialDark = false;
try {
  initialDark = localStorage.getItem('discore-rankings-theme') === 'dark';
} catch {
  /* ignore */
}
document.querySelectorAll<HTMLButtonElement>('.rk-seg[data-division]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.division === 'boys' || btn.dataset.division === 'girls') {
      void setDivision(btn.dataset.division);
    }
  });
});

applyTheme(initialDark);
void setDivision(divisionFromSearch(window.location.search));
