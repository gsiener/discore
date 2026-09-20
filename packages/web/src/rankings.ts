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
  if (!realData) {
    // Fixture fallback: label the requested season honestly, not the fixture's.
    meta.append(` · ${divLabel} · ${season} · no published data yet`);
    return;
  }
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
    sosTd.innerHTML = `<span class="rk-sos-badge" title="Mean opponent rating ${Math.round(t.sos)}">${t.sosPercentile}</span>`;

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
  const summary = document.getElementById('connectivity-summary')!;
  const graph = document.getElementById('connectivity-graph') as unknown as SVGSVGElement;
  const tooltip = document.getElementById('connectivity-tooltip')!;
  const islands = document.getElementById('connectivity-islands')!;
  summary.innerHTML = '';
  graph.querySelectorAll(':scope > g').forEach((el) => el.remove());
  islands.innerHTML = '';

  const visibleTeams = snapshot.teams.filter((team) => !state.hideProvisional || team.qualified);
  const teamById = new Map(visibleTeams.map((team) => [team.id, team]));
  const countedGames = new Map<string, { source: string; target: string; games: SnapshotGame[] }>();
  for (const team of visibleTeams) {
    for (const game of team.games) {
      if (game.ignored || !teamById.has(game.opponentId)) continue;
      const pair = [team.id, game.opponentId].sort();
      const key = `${pair[0]}\u0000${pair[1]}`;
      const edge = countedGames.get(key) ?? { source: pair[0], target: pair[1], games: [] };
      if (team.id === pair[0] && !edge.games.some((g) => g.gameId === game.gameId)) edge.games.push(game);
      countedGames.set(key, edge);
    }
  }

  const neighbors = new Map(visibleTeams.map((team) => [team.id, new Set<string>()]));
  for (const edge of countedGames.values()) {
    neighbors.get(edge.source)?.add(edge.target);
    neighbors.get(edge.target)?.add(edge.source);
  }
  const groups = new Map<number, SnapshotTeam[]>();
  const groupByTeam = new Map<string, number>();
  for (const team of visibleTeams) {
    if (groupByTeam.has(team.id)) continue;
    const groupId = groups.size;
    const members: SnapshotTeam[] = [];
    const queue = [team.id];
    groupByTeam.set(team.id, groupId);
    for (let i = 0; i < queue.length; i++) {
      const current = teamById.get(queue[i]);
      if (current) members.push(current);
      for (const next of neighbors.get(queue[i]) ?? []) {
        if (groupByTeam.has(next)) continue;
        groupByTeam.set(next, groupId);
        queue.push(next);
      }
    }
    groups.set(groupId, members);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const noGames = visibleTeams.filter((team) => neighbors.get(team.id)?.size === 0).length;
  const largest = ordered[0]?.[1] ?? [];
  const anchor = [...largest].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))[0];
  const distances = new Map<string, number>();
  if (anchor) {
    const queue = [anchor.id];
    distances.set(anchor.id, 0);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const next of neighbors.get(id) ?? []) {
        if (distances.has(next)) continue;
        distances.set(next, distances.get(id)! + 1);
        queue.push(next);
      }
    }
  }
  const hops = [...distances.values()].sort((a, b) => a - b);
  const medianHops = hops.length ? hops[Math.floor(hops.length / 2)] : 0;
  const maxHops = hops[hops.length - 1] ?? 0;
  const coverage = visibleTeams.length ? (largest.length / visibleTeams.length) * 100 : 0;
  const coverageLabel = largest.length === visibleTeams.length ? '100%' : `${coverage.toFixed(1)}%`;
  const metrics = [
    ['Connected groups', String(ordered.length), ordered.length === 1 ? 'every rated team shares evidence' : 'separate schedule networks'],
    ['Largest network', coverageLabel, `${largest.length} of ${visibleTeams.length} teams`],
    ['Degrees from #1', `${medianHops} / ${maxHops}`, `median / max hops from ${anchor?.name ?? 'top team'}`],
    ['Counted matchups', String(countedGames.size), 'unique opponent pairings'],
    ['No counted games', String(noGames), 'teams outside the graph'],
  ];
  for (const [label, value, detail] of metrics) {
    const item = document.createElement('div');
    item.className = 'rk-connectivity-metric';
    const labelEl = document.createElement('span');
    labelEl.className = 'rk-connectivity-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.textContent = value;
    const detailEl = document.createElement('span');
    detailEl.className = 'rk-connectivity-detail';
    detailEl.textContent = detail;
    item.append(labelEl, valueEl, detailEl);
    summary.appendChild(item);
  }

  const width = 1000;
  const height = 620;
  const palette = ['#178276', '#6157d9', '#d97706', '#db3d7d', '#1683b6', '#43a56f', '#9b59b6'];
  const componentIndex = new Map(ordered.map(([id], index) => [id, index]));
  const componentCenters = [
    [500, 310], [120, 100], [880, 100], [120, 520], [880, 520], [500, 70], [500, 550],
  ];
  const hash = (value: string): number => {
    let result = 2166136261;
    for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  };
  const nodes = visibleTeams.map((team) => {
    const groupId = groupByTeam.get(team.id) ?? 0;
    const index = componentIndex.get(groupId) ?? 0;
    const center = componentCenters[index] ?? [80 + (hash(String(groupId)) % 840), 80 + (hash(team.id) % 460)];
    const angle = (hash(team.id) / 0xffffffff) * Math.PI * 2;
    const spread = index === 0 ? 250 : Math.min(42, 10 + (ordered[index]?.[1].length ?? 1) * 5);
    return {
      team,
      x: center[0] + Math.cos(angle) * spread * (0.35 + ((hash(`${team.id}x`) % 100) / 100)),
      y: center[1] + Math.sin(angle) * spread * (0.35 + ((hash(`${team.id}y`) % 100) / 100)),
      vx: 0,
      vy: 0,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.team.id, node]));
  const edges = [...countedGames.values()].flatMap((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    return source && target ? [{ ...edge, source, target }] : [];
  });

  // A small deterministic force pass keeps the graph dependency-free and stable between renders.
  for (let iteration = 0; iteration < 70; iteration++) {
    for (const edge of edges) {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance - 33) * 0.003;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      edge.source.vx += fx;
      edge.source.vy += fy;
      edge.target.vx -= fx;
      edge.target.vy -= fy;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance2 = dx * dx + dy * dy;
        if (distance2 > 1800) continue;
        const force = 11 / Math.max(18, distance2);
        a.vx -= dx * force;
        a.vy -= dy * force;
        b.vx += dx * force;
        b.vy += dy * force;
      }
    }
    for (const node of nodes) {
      const index = componentIndex.get(groupByTeam.get(node.team.id) ?? 0) ?? 0;
      const center = componentCenters[index] ?? [500, 310];
      node.vx += (center[0] - node.x) * (index === 0 ? 0.0008 : 0.006);
      node.vy += (center[1] - node.y) * (index === 0 ? 0.0008 : 0.006);
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x = Math.max(18, Math.min(width - 18, node.x + node.vx));
      node.y = Math.max(18, Math.min(height - 18, node.y + node.vy));
    }
  }

  const svg = (tag: string): SVGElement => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const edgeLayer = svg('g');
  edgeLayer.classList.add('rk-network-edges');
  const nodeLayer = svg('g');
  nodeLayer.classList.add('rk-network-nodes');
  const labelLayer = svg('g');
  labelLayer.classList.add('rk-network-labels');
  graph.append(edgeLayer, nodeLayer, labelLayer);
  const linesByTeam = new Map<string, SVGLineElement[]>();
  const circlesByTeam = new Map<string, SVGCircleElement>();
  for (const edge of edges) {
    const line = svg('line') as SVGLineElement;
    line.setAttribute('x1', edge.source.x.toFixed(1));
    line.setAttribute('y1', edge.source.y.toFixed(1));
    line.setAttribute('x2', edge.target.x.toFixed(1));
    line.setAttribute('y2', edge.target.y.toFixed(1));
    line.dataset.source = edge.source.team.id;
    line.dataset.target = edge.target.team.id;
    const results = new Set(edge.games.map((game) => game.result));
    line.dataset.sourceResult = results.size === 1 ? edge.games[0]?.result ?? 'T' : 'T';
    edgeLayer.appendChild(line);
    for (const id of [edge.source.team.id, edge.target.team.id]) {
      const list = linesByTeam.get(id) ?? [];
      list.push(line);
      linesByTeam.set(id, list);
    }
  }

  const rankedRatings = visibleTeams.map((team) => team.rating).sort((a, b) => a - b);
  const lowRating = rankedRatings[Math.floor(rankedRatings.length * 0.05)] ?? 0;
  const highRating = rankedRatings[Math.floor(rankedRatings.length * 0.95)] ?? lowRating + 1;
  const clearHighlight = (): void => {
    graph.classList.remove('rk-network-active');
    graph.querySelectorAll('.rk-link-win, .rk-link-loss, .rk-link-mixed, .rk-node-active, .rk-node-neighbor').forEach((el) => {
      el.classList.remove('rk-link-win', 'rk-link-loss', 'rk-link-mixed', 'rk-node-active', 'rk-node-neighbor');
    });
    tooltip.classList.add('hidden');
  };
  for (const node of nodes) {
    const circle = svg('circle') as SVGCircleElement;
    const normalized = Math.max(0, Math.min(1, (node.team.rating - lowRating) / Math.max(1, highRating - lowRating)));
    circle.setAttribute('cx', node.x.toFixed(1));
    circle.setAttribute('cy', node.y.toFixed(1));
    circle.setAttribute('r', (3.2 + normalized * 5).toFixed(1));
    const groupId = groupByTeam.get(node.team.id) ?? 0;
    circle.setAttribute('fill', palette[(componentIndex.get(groupId) ?? 0) % palette.length]);
    circle.setAttribute('tabindex', '0');
    circle.setAttribute('role', 'button');
    circle.setAttribute('aria-label', `${node.team.name}, rating ${Math.round(node.team.rating)}, ${node.team.gamesPlayed} games`);
    circle.classList.add('rk-network-node');
    circle.dataset.teamId = node.team.id;
    circlesByTeam.set(node.team.id, circle);
    if (groupId !== ordered[0]?.[0]) circle.classList.add('rk-network-island-node');
    const title = svg('title');
    title.textContent = `${node.team.name} · ${Math.round(node.team.rating)}`;
    circle.appendChild(title);
    const highlight = (): void => {
      clearHighlight();
      graph.classList.add('rk-network-active');
      circle.classList.add('rk-node-active');
      for (const line of linesByTeam.get(node.team.id) ?? []) {
        const isSource = line.dataset.source === node.team.id;
        const opponentId = isSource ? line.dataset.target : line.dataset.source;
        const result = isSource
          ? line.dataset.sourceResult
          : line.dataset.sourceResult === 'W' ? 'L' : line.dataset.sourceResult === 'L' ? 'W' : 'T';
        line.classList.add(result === 'W' ? 'rk-link-win' : result === 'L' ? 'rk-link-loss' : 'rk-link-mixed');
        if (opponentId) circlesByTeam.get(opponentId)?.classList.add('rk-node-neighbor');
      }
      tooltip.innerHTML = '';
      const tooltipName = document.createElement('strong');
      tooltipName.textContent = node.team.name;
      const tooltipDetail = document.createElement('span');
      tooltipDetail.textContent = `${Math.round(node.team.rating)} rating · ${node.team.gamesPlayed} games · ${neighbors.get(node.team.id)?.size ?? 0} opponents`;
      tooltip.append(tooltipName, tooltipDetail);
      tooltip.classList.remove('hidden');
    };
    circle.addEventListener('mouseenter', highlight);
    circle.addEventListener('focus', highlight);
    circle.addEventListener('mouseleave', clearHighlight);
    circle.addEventListener('blur', clearHighlight);
    circle.addEventListener('click', () => showTeam(node.team.id));
    circle.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      showTeam(node.team.id);
    });
    nodeLayer.appendChild(circle);
    if (node.team.rank != null && node.team.rank <= 10 && groupId === ordered[0]?.[0]) {
      const label = svg('text');
      const labelOnLeft = node.x > width - 160;
      label.setAttribute('x', (node.x + (labelOnLeft ? -10 : 10)).toFixed(1));
      label.setAttribute('y', (node.y + 4).toFixed(1));
      if (labelOnLeft) label.setAttribute('text-anchor', 'end');
      label.textContent = node.team.name;
      labelLayer.appendChild(label);
    }
  }

  const islandGroups = ordered.slice(1);
  const heading = document.createElement('h2');
  heading.id = 'connectivity-islands-title';
  heading.textContent = islandGroups.length ? 'Disconnected islands' : 'One connected network';
  islands.appendChild(heading);
  const explanation = document.createElement('p');
  explanation.textContent = islandGroups.length
    ? 'These teams have no counted-game path to the main network, so ratings across groups do not share evidence.'
    : 'Every rated team can be reached through counted games.';
  islands.appendChild(explanation);
  for (const [, members] of islandGroups) {
    const group = document.createElement('div');
    group.className = 'rk-island-group';
    const label = document.createElement('strong');
    label.textContent = `${members.length} team${members.length === 1 ? '' : 's'}`;
    group.appendChild(label);
    for (const member of [...members].sort((a, b) => b.rating - a.rating)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${member.name} (${Math.round(member.rating)})`;
      button.addEventListener('click', () => showTeam(member.id));
      group.appendChild(button);
    }
    islands.appendChild(group);
  }
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
  const active = VIEW_TABS[view === 'team' ? 'teams' : view];
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
      `<td class="num" title="Mean opponent rating ${Math.round(t.sos)}">${t.sosPercentile}</td>` +
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
      `<div><h3>${eventTitleHtml(e.name, e.url, 'rk-tournament-link')}</h3><span class="rk-tournament-counts">${e.games} games · ${e.teams} teams</span></div>` +
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

const CAL_ICON =
  `<svg class="rk-cal" width="14" height="14" viewBox="0 0 16 16" fill="none" ` +
  `stroke="currentColor" stroke-width="1.5" aria-hidden="true">` +
  `<rect x="2" y="3" width="12" height="11" rx="2"/>` +
  `<line x1="2" y1="6.5" x2="14" y2="6.5"/>` +
  `<line x1="5.5" y1="1.5" x2="5.5" y2="4"/><line x1="10.5" y1="1.5" x2="10.5" y2="4"/></svg>`;

function fmtDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** "Jul 11 – Jul 12, 2026": year once when the range stays in one year. */
function fmtDateRange(from: string, to: string): string {
  if (from === to || !from || !to) return fmtDate(from || to);
  if (from.slice(0, 4) === to.slice(0, 4)) return `${fmtDateShort(from)} – ${fmtDate(to)}`;
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

/** Tournament name -> source URL, for linking event titles. */
function eventUrlByName(): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of tournamentSummaries) {
    if (e.url && !m.has(e.name)) m.set(e.name, e.url);
  }
  return m;
}

/** Plain title, or a link when we have the event's source URL. */
function eventTitleHtml(name: string, url: string | null, cls: string): string {
  return url
    ? `<a class="${cls}" href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`
    : name;
}

function eventCard(grp: TeamGameGroup, url: string | null): string {
  const record =
    grp.ties > 0 ? `${grp.wins}–${grp.losses}–${grp.ties}` : `${grp.wins}–${grp.losses}`;
  return (
    `<section class="rk-team-event">` +
    `<div class="rk-team-event-head"><div>` +
    `<h3>${eventTitleHtml(grp.name, url, 'rk-team-event-link')}</h3>` +
    `<p class="rk-team-event-dates">${CAL_ICON}<span>${fmtDateRange(grp.from, grp.to)}</span></p>` +
    `</div><span class="rk-team-event-record">${record}</span></div>` +
    `<ul class="rk-team-event-games">` +
    grp.games.map((g) => gameRow(g)).join('') +
    `</ul></section>`
  );
}

function gameRow(g: SnapshotGame): string {
  const outcome = g.ignored
    ? 'ignored'
    : g.result === 'W'
      ? 'win'
      : g.result === 'L'
        ? 'loss'
        : 'tie';
  const effectCls =
    g.effect > 0
      ? 'rk-team-game-effect-pos'
      : g.effect < 0
        ? 'rk-team-game-effect-neg'
        : 'rk-team-game-effect-zero';
  const effectText = (g.effect >= 0 ? '+' : '') + g.effect.toFixed(1);
  const weights =
    `${g.scoreWeight.toFixed(2)}/${g.dateWeight.toFixed(2)}/${g.seriesMultiplier.toFixed(1)}`;
  const verdict = g.result === 'W' ? 'Win' : g.result === 'L' ? 'Loss' : 'Tie';
  const ignoredFlag = g.ignored
    ? `<span class="rk-team-game-flag"> · ignored${g.ignoreReason ? ` · ${g.ignoreReason}` : ''}</span>`
    : '';
  return (
    `<li class="rk-team-game rk-team-game-${outcome}" aria-label="${verdict} vs ${g.opponentName} ${g.scoreFor}–${g.scoreAgainst}">` +
    `<span class="rk-team-game-dot" aria-hidden="true"></span>` +
    `<span class="rk-team-game-result" aria-hidden="true">${g.result}</span>` +
    `<span class="rk-team-game-opp">${g.opponentName}${ignoredFlag}</span>` +
    `<span class="rk-team-game-score">${g.scoreFor}–${g.scoreAgainst}</span>` +
    `<span class="rk-team-game-facts">` +
    `<span class="rk-team-game-date">${fmtDateShort(g.date)}</span>` +
    `<span class="rk-team-game-rating" title="Game rating ${g.gameRating.toFixed(1)}, weights (S/D/X) ${weights}">${g.gameRating.toFixed(1)}</span>` +
    `<span class="${effectCls}" title="Rating effect of this game">${effectText}</span>` +
    `</span>` +
    `</li>`
  );
}

function renderTeamGamesBody(games: SnapshotGame[]): void {
  const body = document.getElementById('team-games-body')!;
  const urls = eventUrlByName();
  body.innerHTML = groupTeamGames(games)
    .map((grp) => eventCard(grp, urls.get(grp.name) ?? null))
    .join('');
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
    `SoS ${t.sosPercentile}/100 · confidence ${t.confidence} · ${statusLabel(t)}`;
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

function applyTheme(dark: boolean, persist = true): void {
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  document.getElementById('theme-toggle')!.textContent = dark ? '☀' : '☾';
  if (persist) {
    try {
      localStorage.setItem('discore-rankings-theme', dark ? 'dark' : 'light');
    } catch {
      /* private mode: theme just won't persist */
    }
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
  if (list !== 'tournaments') showList(list);
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

let initialDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
try {
  const savedTheme = localStorage.getItem('discore-rankings-theme');
  if (savedTheme) initialDark = savedTheme === 'dark';
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

applyTheme(initialDark, false);
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
