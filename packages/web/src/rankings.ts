/**
 * Rankings page: standings table, connectivity view, and team detail
 * rendered from a published @scorebot/rankings snapshot.
 */
import type { CanonicalDataset, Snapshot, SnapshotGame, SnapshotTeam } from '@scorebot/rankings';
import {
  buildTournamentSummaries,
  filterTeams,
  groupTeamGames,
  regionAbbrev,
  regionSeed,
  sortTeams,
  sortTeamsAlpha,
  sparkColor,
  sparkPoints,
  statusLabel,
  type RankRow,
  type TeamGameGroup,
  type TournamentSummary,
} from './rankings-logic.js';
// Published snapshots load at runtime; the fixture stands in when they are
// absent (local dev without a Drive pull, CI builds).
import fixtureSnapshot from './rankings/snapshot-boys-fixture.json';
import fixtureDataset from './simulate/small-season.json';
import {
  SEASONS,
  divisionFromSearch,
  loadDivision,
  seasonFromSearch,
  type Division,
  type LoadedData,
  type Season,
} from './snapshotLoader.js';

const fixture = {
  snapshot: fixtureSnapshot as unknown as Snapshot,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataset: fixtureDataset as any,
};

let snapshot: Snapshot = fixture.snapshot;
let dataset: CanonicalDataset = fixture.dataset;
let tournamentSummaries: TournamentSummary[] = buildTournamentSummaries(dataset);
let realData = false;
let division: Division = 'boys';
let season: Season = seasonFromSearch(window.location.search);
// True when the requested division has no published snapshot AND the fixture
// is not that division (fixture is boys) — render an honest empty state.
let divisionEmpty = false;

type ListView = 'standings' | 'connectivity' | 'teams' | 'tournaments';

interface State {
  query: string;
  hideProvisional: boolean;
  sortDir: 'asc' | 'desc';
  view: ListView | 'team';
  returnView: ListView;
  teamId: string | null;
}

const state: State = {
  query: '',
  hideProvisional: true,
  sortDir: 'asc',
  view: 'standings',
  returnView: 'standings',
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

function filteredRows(): RankRow[] {
  return filterTeams(rows, { query: state.query, region: 'all', hideProvisional: state.hideProvisional });
}

function currentRows(): RankRow[] {
  return sortTeams(filteredRows(), state.sortDir);
}

function renderMeta(): void {
  const m = snapshot.meta;
  const divLabel = m.division === 'boys' ? 'High School Boys' : m.division === 'girls' ? 'High School Girls' : m.division;
  const meta = document.getElementById('rk-meta')!;
  meta.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = realData ? 'Final' : 'Snapshot';
  meta.appendChild(strong);
  meta.append(
    ` · ${divLabel} · ${m.season} · ${snapshot.teams.length} teams · ${m.totalGames} games · ` +
    `final results through ${fmtDate(m.resultsThrough)} · updated ${fmtDate(m.generatedAt)}`,
  );
}

function renderDivisionSegment(): void {
  document.querySelectorAll<HTMLButtonElement>('.rk-seg[data-division]').forEach((btn) => {
    btn.classList.toggle('rk-seg-active', btn.dataset.division === division);
  });
}

/** Keep the URL a permalink of the current view (season + division + view + open team). */
function writeUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('season', season);
  url.searchParams.set('division', division);
  if (state.view === 'team' && state.teamId) {
    url.searchParams.set('team', state.teamId);
    url.searchParams.delete('view');
  } else {
    url.searchParams.delete('team');
    if (state.view === 'standings') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', state.view);
    }
  }
  window.history.replaceState({}, '', url.toString());
}

async function setDivision(next: Division): Promise<void> {
  division = next;
  const loaded: LoadedData = await loadDivision(next, fetch, fixture, season);
  snapshot = loaded.snapshot;
  dataset = loaded.dataset;
  tournamentSummaries = buildTournamentSummaries(dataset);
  realData = loaded.real;
  divisionEmpty = !loaded.real && next !== 'boys';
  rebuildIndex();
  state.query = '';
  state.teamId = null;
  (document.getElementById('header-search') as HTMLInputElement).value = '';
  renderDivisionSegment();
  renderSeasonSelect();
  renderMeta();
  showList('standings');
}

/** Switch season, then reload the current division under it. */
function setSeason(next: Season): Promise<void> {
  season = next;
  return setDivision(division);
}

function renderSeasonSelect(): void {
  const select = document.getElementById('season-select') as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = '';
  for (const s of SEASONS) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === season) opt.selected = true;
    select.appendChild(opt);
  }
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

function confHtml(t: SnapshotTeam): string {
  const cls = t.confidence === 'high' ? 'rk-conf-high' : t.confidence === 'med' ? 'rk-conf-med' : 'rk-conf-low';
  const label = t.confidence === 'high' ? 'High' : t.confidence === 'med' ? 'Med' : 'Low';
  return `<span class="rk-conf ${cls}">${label}</span>`;
}

function teamCellHtml(t: SnapshotTeam, extra = ''): string {
  return (
    `<span class="rk-teamcell"><span class="rk-avatar">${t.name.charAt(0)}</span>` +
    `<span class="rk-teamname">${t.name}</span>${extra}</span>`
  );
}

function statusHtml(r: RankRow): string {
  const label = statusLabel(r);
  return `<span class="rk-status${label === 'Ranked' ? '' : ' rk-status-prov'}">${label}</span>`;
}

function recordHtml(t: SnapshotTeam): string {
  return `<span class="rk-record">${t.wins}–${t.losses}</span>`;
}

function renderTable(): void {
  const body = document.getElementById('rankings-body')!;
  body.innerHTML = '';
  if (divisionEmpty) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '10');
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
    teamTd.innerHTML = teamCellHtml(
      t,
      t.region && seed ? `<span class="rk-seed">${regionAbbrev(t.region)} ${seed}</span>` : '',
    );

    const statusTd = document.createElement('td');
    statusTd.innerHTML = statusHtml(r);

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
    recordTd.innerHTML = recordHtml(t);

    const sosTd = document.createElement('td');
    sosTd.innerHTML = `<span class="rk-sos-badge" title="Mean opponent rating, percentile ${t.sosPercentile}">${Math.round(t.sos)}</span>`;

    const gpTd = document.createElement('td');
    gpTd.textContent = String(t.gamesPlayed);

    const confTd = document.createElement('td');
    confTd.innerHTML = confHtml(t);

    tr.append(rankTd, teamTd, statusTd, ratingTd, deltaTd, trendTd, recordTd, sosTd, gpTd, confTd);
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

/** Which top tab (`tb-*`) owns each list view, and which sub tab (`tab-*`) if any. */
const VIEW_TABS: Record<ListView, { tab: string; subtab?: string }> = {
  standings: { tab: 'tb-rankings', subtab: 'tab-standings' },
  connectivity: { tab: 'tb-rankings', subtab: 'tab-connectivity' },
  teams: { tab: 'tb-teams' },
  tournaments: { tab: 'tb-tournaments' },
};

const RENDERERS: Record<ListView, () => void> = {
  standings: renderTable,
  connectivity: renderConnectivity,
  teams: renderTeams,
  tournaments: renderTournaments,
};

function setView(view: State['view']): void {
  state.view = view;
  if (view !== 'team') state.returnView = view;
  const listViews = Object.keys(VIEW_TABS) as ListView[];
  for (const v of [...listViews, 'team'] as const) {
    document.getElementById(`${v}-view`)!.classList.toggle('hidden', view !== v);
  }
  document.getElementById('hide-provisional')!.classList.toggle('hidden', view === 'team');
  const active = VIEW_TABS[view === 'team' ? state.returnView : view];
  for (const v of listViews) {
    const { tab, subtab } = VIEW_TABS[v];
    document.getElementById(tab)!.classList.toggle('rk-tab-active', tab === active.tab);
    if (!subtab) continue;
    const el = document.getElementById(subtab)!;
    el.classList.toggle('rk-viewtab-active', subtab === active.subtab);
    el.setAttribute('aria-selected', String(subtab === active.subtab));
  }
  document.getElementById('standings-viewtabs')!.classList.toggle('hidden', !active.subtab);
}

/** Switch to a list view and render it. */
function showList(view: ListView): void {
  setView(view);
  writeUrl();
  RENDERERS[view]();
}

function renderTeams(): void {
  const body = document.getElementById('teams-body')!;
  body.innerHTML = '';
  for (const r of sortTeamsAlpha(filteredRows())) {
    const t = byId.get(r.id)!;
    const tr = document.createElement('tr');
    tr.dataset.team = t.id;
    tr.innerHTML =
      `<td>${teamCellHtml(t)}</td>` +
      `<td>${statusHtml(r)}</td>` +
      `<td class="num">${Math.round(t.rating)}</td>` +
      `<td class="num">${recordHtml(t)}</td>` +
      `<td class="num">${Math.round(t.sos)}</td>` +
      `<td>${confHtml(t)}</td>`;
    tr.addEventListener('click', () => showTeam(t.id));
    body.appendChild(tr);
  }
}

function renderTournaments(): void {
  const body = document.getElementById('tournaments-body')!;
  body.innerHTML = '';
  for (const e of tournamentSummaries) {
    const section = document.createElement('section');
    section.className = 'rk-tournament-section';
    const dates = e.from === e.to ? fmtDate(e.from) : `${fmtDate(e.from)} – ${fmtDate(e.to)}`;
    section.innerHTML =
      `<div class="rk-tournament-header">` +
      `<div><h3>${e.name}</h3><span class="rk-tournament-counts">${e.games} games · ${e.teams} teams</span></div>` +
      `<div class="rk-tournament-facts"><span class="rk-tournament-date">${dates}</span>` +
      `<span class="rk-event-type${e.league ? ' rk-event-league' : ''}">${e.league ? 'League' : 'Tournament'}</span></div>` +
      `</div>` +
      `<div class="rk-tournament-footer">` +
      `<span>${e.league ? 'League results' : 'Tournament results'}</span>` +
      (e.url
        ? `<a href="${e.url}" target="_blank" rel="noopener noreferrer">View source ↗</a>`
        : `<span class="rk-event-meta">No source link</span>`) +
      `</div>`;
    body.appendChild(section);
  }
}

function eventGroupHeader(grp: TeamGameGroup): string {
  const record =
    grp.ties > 0 ? `${grp.wins}–${grp.losses}–${grp.ties}` : `${grp.wins}–${grp.losses}`;
  const dates =
    grp.from === grp.to ? fmtDate(grp.from) : `${fmtDate(grp.from)} – ${fmtDate(grp.to)}`;
  return (
    `<tr class="rk-event-group"><td colspan="7"><strong>${grp.name}</strong>` +
    `<span class="rk-event-meta"> · ${record} · ${dates}</span></td></tr>`
  );
}

function tournamentSection(g: SnapshotGame): string {
  const cls = g.ignored ? ' class="ignored"' : '';
  const cells = [
    g.opponentName,
    fmtDate(g.date),
    `${g.result} ${g.scoreFor}-${g.scoreAgainst}`,
    g.gameRating.toFixed(1),
    (g.effect >= 0 ? '+' : '') + g.effect.toFixed(1),
    `${g.scoreWeight.toFixed(2)}/${g.dateWeight.toFixed(2)}/${g.seriesMultiplier.toFixed(1)}`,
    g.ignored ? `ignored (${g.ignoreReason})` : 'counted',
  ];
  return `<tr${cls}>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
}

function renderTeamGamesBody(games: SnapshotGame[]): void {
  const body = document.getElementById('team-games-body')!;
  body.innerHTML = '';
  for (const grp of groupTeamGames(games)) {
    body.insertAdjacentHTML('beforeend', eventGroupHeader(grp));
    for (const g of grp.games) body.insertAdjacentHTML('beforeend', tournamentSection(g));
  }
}

function showTeam(id: string): void {
  const t = byId.get(id);
  if (!t) return;
  state.teamId = id;
  setView('team');
  writeUrl();
  document.getElementById('team-name')!.textContent = t.name;
  document.getElementById('team-summary')!.textContent = teamSummary(t);
  renderTeamGamesBody(t.games);
}

function teamSummary(t: SnapshotTeam): string {
  return `Rating ${t.rating.toFixed(1)} · ${t.wins}–${t.losses} (counted) · ` +
    `SoS ${t.sos.toFixed(0)} (p${t.sosPercentile}) · confidence ${t.confidence} · ${statusLabel(t)}`;
}

function renderProvisionalToggle(btn: HTMLButtonElement): void {
  btn.setAttribute('aria-pressed', String(state.hideProvisional));
  btn.textContent = state.hideProvisional ? 'Show provisional' : 'Hide provisional';
}

function syncQuery(value: string): void {
  state.query = value;
  (document.getElementById('header-search') as HTMLInputElement).value = value;
  // Connectivity and tournaments ignore the query; only re-render filterable lists.
  const list = state.view === 'team' ? state.returnView : state.view;
  if (list === 'standings' || list === 'teams') showList(list);
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
  syncQuery((e.target as HTMLInputElement).value);
});
document.getElementById('hide-provisional')!.addEventListener('click', (e) => {
  state.hideProvisional = !state.hideProvisional;
  renderProvisionalToggle(e.currentTarget as HTMLButtonElement);
  const list = state.view === 'team' ? state.returnView : state.view;
  if (list === 'standings' || list === 'teams') showList(list);
});
renderProvisionalToggle(document.getElementById('hide-provisional') as HTMLButtonElement);
document.getElementById('sort-rank')!.addEventListener('click', () => {
  state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  renderTable();
});
document.getElementById('tab-standings')!.addEventListener('click', () => showList('standings'));
document.getElementById('tab-connectivity')!.addEventListener('click', () => showList('connectivity'));
document.getElementById('back-link')!.addEventListener('click', (e) => {
  e.preventDefault();
  showList(state.returnView);
});
document.getElementById('tb-rankings')!.addEventListener('click', () => showList('standings'));
document.getElementById('tb-teams')!.addEventListener('click', () => showList('teams'));
document.getElementById('tb-tournaments')!.addEventListener('click', () => showList('tournaments'));
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
document.getElementById('season-select')?.addEventListener('change', (e) => {
  const value = (e.target as HTMLSelectElement).value;
  if ((SEASONS as readonly string[]).includes(value)) {
    void setSeason(value as Season);
  }
});

applyTheme(initialDark);
// Capture before setDivision rewrites the URL: deep-link to ?view= and
// ?team= once data is loaded.
const deepLinkView = new URLSearchParams(window.location.search).get('view');
const deepLinkTeam = new URLSearchParams(window.location.search).get('team');
void setDivision(divisionFromSearch(window.location.search)).then(() => {
  if (deepLinkTeam && byId.has(deepLinkTeam)) {
    showTeam(deepLinkTeam);
  } else if (
    deepLinkView === 'teams' ||
    deepLinkView === 'tournaments' ||
    deepLinkView === 'connectivity'
  ) {
    showList(deepLinkView);
  }
});
