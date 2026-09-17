/**
 * Local-only migration check (NOT run in CI).
 * Converts the gitignored legacy exports under packages/web/public/rankings/
 * to canonical datasets, runs the new engine, and compares against legacy
 * ranks/ratings. Run: npm run scale-check --workspace=@scorebot/rankings
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertLegacyExport, mirrorKey } from '../src/legacy.js';
import { normalizeTeamName } from '../src/normalize.js';
import { parseCanonicalDataset } from '../src/dataset.js';
import { datasetToNormalized } from '../src/adapter.js';
import { runRatings } from '../src/ratings.js';
import { buildSnapshot } from '../src/snapshot.js';
import { HS_2025_V1 } from '../src/rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', '..', 'web', 'public', 'rankings');

function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array(xs.length);
    order.forEach(([ , i], k) => { r[i] = k; });
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const ma = ra.reduce((x, y) => x + y, 0) / n;
  const mb = rb.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

for (const file of ['data_boys.json', 'data_girls.json']) {
  const path = join(pub, file);
  if (!existsSync(path)) {
    console.log(`${file}: missing (Drive export not pulled) — skipping`);
    continue;
  }
  const legacy = JSON.parse(readFileSync(path, 'utf8'));
  const t0 = Date.now();
  // Migration-only alias map (same-team name variants). Canonical curation
  // owns NAME_MAP long-term; this keeps the local check running explicitly.
  const { dataset, report } = convertLegacyExport(legacy, {
    aliases: { 'Stewarts Creek': "Stewart's Creek" },
  });
  const { warnings } = parseCanonicalDataset(dataset);
  const snap = buildSnapshot(dataset, HS_2025_V1, { generatedAt: 'local-check' });
  const ms = Date.now() - t0;

  const legacyByName = new Map(legacy.teams.map((t: { name: string; rank: number; rating: number }) => [t.name, t]));
  const common = snap.teams.filter((t) => legacyByName.has(t.name) && !t.id.startsWith('ext-'));
  const qual = common.filter((t) => t.qualified);
  const metrics = (list: typeof common) => {
    const lr = list.map((t) => legacyByName.get(t.name)!.rank);
    const nr = list.map((t) => t.rank!);
    const diffs = list.map((t) => t.rating - legacyByName.get(t.name)!.rating);
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const mae = diffs.reduce((a, b) => a + Math.abs(b - mean), 0) / diffs.length;
    return { n: list.length, spearman: spearman(lr, nr), mae };
  };
  const all = metrics(common);
  const q = metrics(qual);
  const legacyTop25 = new Set(
    legacy.teams.filter((t: { rank: number }) => t.rank && t.rank <= 25).map((t: { name: string }) => t.name),
  );
  const newTop25 = new Set(snap.teams.filter((t) => t.rank && t.rank <= 25).map((t) => t.name));
  const overlap25 = [...legacyTop25].filter((n) => newTop25.has(n)).length;

  console.log(`\n=== ${file} (${ms}ms) ===`);
  console.log(`teams: in=${report.teamsIn} out=${report.teamsOut} external=${report.externalTeams.length}`);
  console.log(`logs=${report.logEntries} mirrored=${report.mirroredGames} singleton=${report.singletonGames}`);
  console.log(`unresolvedTournaments=${report.unresolvedTournaments.length} unparseableScores=${report.unparseableScores.length} undated=${report.undatedGames}`);
  if (warnings.length) console.log(`validation warnings: ${warnings.length}`);
  console.log(`snapshot: total=${snap.meta.totalGames} rated=${snap.meta.ratedGames} ignored=${snap.meta.ignoredGames} converged=${snap.meta.converged} iters=${snap.meta.iterations} rms=${snap.meta.finalRms.toExponential(2)}`);
  console.log(`migration all: n=${all.n} spearman=${all.spearman.toFixed(4)} meanAdjMAE=${all.mae.toFixed(1)}`);
  console.log(`migration qualified: n=${q.n} spearman=${q.spearman.toFixed(4)} meanAdjMAE=${q.mae.toFixed(1)} top25overlap=${overlap25}/25`);
  console.log('top 10 new: ' + snap.teams.slice(0, 10).map((t) => `${t.rank}.${t.name} ${t.rating}`).join(' | '));

  // Blowout-rule agreement: legacy log entries carry ignored flags. Rebuild
  // mirror keys for ignored entries and compare against our ignored set.
  {
    const MONTHS: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    const fallYear = parseInt(legacy.season.split('-')[0], 10);
    const nameToId = new Map(dataset.teams.map((t) => [normalizeTeamName(t.displayName), t.id] as const));
    for (const t of dataset.teams) nameToId.set(t.displayName, t.id);
    nameToId.set("Stewarts Creek", nameToId.get("Stewart's Creek")!);
    const keyToId = new Map(dataset.games.map((g) => {
      const k = mirrorKey(
        g.teamAId, g.teamBId, g.date === '2000-01-01' ? null : g.date,
        (g.scoreA ?? 0) >= (g.scoreB ?? 0) ? g.teamAId : g.teamBId,
        Math.max(g.scoreA ?? 0, g.scoreB ?? 0), Math.min(g.scoreA ?? 0, g.scoreB ?? 0), g.eventId,
      );
      return [k, g.id] as const;
    }));
    const legacyIgnored = new Set<string>();
    for (const t of legacy.teams) {
      const teamId = nameToId.get(normalizeTeamName(t.name)) ?? nameToId.get(t.name);
      for (const g of t.games ?? []) {
        if (!g.ignored) continue;
        const oppId = nameToId.get(normalizeTeamName(g.opponent)) ?? nameToId.get(g.opponent);
        if (!teamId || !oppId) continue;
        const m = (g.score ?? '').match(/(\d+)\s*[-:]\s*(\d+)/);
        if (!m) continue;
        const mine = parseInt(m[1], 10);
        const theirs = parseInt(m[2], 10);
        const dm = (g.date ?? '').match(/^([A-Za-z]+)\s+(\d{1,2})$/);
        const date = dm ? `${dm[1] && MONTHS[dm[1].slice(0, 3)] >= 8 ? fallYear : fallYear + 1}-${String(MONTHS[dm[1].slice(0, 3)]).padStart(2, '0')}-${dm[2].padStart(2, '0')}` : null;
        const winner = g.result === 'W' ? teamId : oppId;
        // event: match by tournament name via dataset events
        const eid = Object.values(dataset.events).find((e) => e.name === g.tournament)?.id ?? null;
        const id = keyToId.get(mirrorKey(teamId, oppId, date, winner, Math.max(mine, theirs), Math.min(mine, theirs), eid));
        if (id) legacyIgnored.add(id);
      }
    }
    const ours = new Set(snap.teams.flatMap((t) => t.games.filter((x) => x.ignored).map((x) => x.gameId)));
    const both = [...legacyIgnored].filter((id) => ours.has(id)).length;
    const jaccard = both / new Set([...legacyIgnored, ...ours]).size;
    console.log(`blowouts: legacy=${legacyIgnored.size} ours=${ours.size} overlap=${both} jaccard=${jaccard.toFixed(3)}`);
  }

  if (process.env.EQ_PROBE) {
    // Legacy-parity probe: equal weights isolate solver differences from
    // deliberate score/date weighting. Expect near-1.0 if engines agree.
    const { dataset: ds2 } = convertLegacyExport(legacy, {
      aliases: { 'Stewarts Creek': "Stewart's Creek" },
    });
    const { games: ng } = datasetToNormalized(ds2, HS_2025_V1);
    const eq = ng.map((g) => ({ ...g, weight: 1, scoreWeight: 1, dateWeight: 1, seriesMultiplier: 1 }));
    const res = runRatings(eq, HS_2025_V1);
    const nameOf = new Map(ds2.teams.map((t) => [t.id, t.displayName]));
    const order = [...res.teams.entries()].sort((a, b) => b[1].rating - a[1].rating).map(([id]) => id);
    const rankOf = new Map(order.map((id, i) => [id, i + 1]));
    const la = [];
    const na = [];
    for (const [id] of res.teams) {
      const lrk = legacyByName.get(nameOf.get(id)!)?.rank;
      if (lrk) {
        la.push(lrk);
        na.push(rankOf.get(id)!);
      }
    }
    console.log(`EQ_PROBE equal-weight spearman=${spearman(la, na).toFixed(4)} converged=${res.converged} iters=${res.iterations}`);
  }
}
