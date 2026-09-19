/**
 * Local-only snapshot publisher (NOT run in CI).
 * Converts the per-season Drive exports in packages/web/public/rankings/<season>/
 * (gitignored) into published snapshot + dataset JSON consumed at runtime by the
 * standings/simulate/lab pages. Runs automatically via web `predeploy`.
 * Seasons without a Drive pull yet are skipped; at least one must build.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertLegacyExport } from '../src/legacy.js';
import { parseCanonicalDataset } from '../src/dataset.js';
import { buildSnapshot } from '../src/snapshot.js';
import { HS_2025_V1, HS_2026_V1, type Ruleset } from '../src/rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', '..', 'web', 'public', 'rankings');

const SEASONS: { season: string; rules: Ruleset }[] = [
  { season: '2025-26', rules: HS_2025_V1 },
  { season: '2026-27', rules: HS_2026_V1 },
];

let built = 0;
for (const { season, rules } of SEASONS) {
  for (const div of ['boys', 'girls']) {
    const input = join(pub, season, `data_${div}.json`);
    if (!existsSync(input)) {
      console.warn(`skip ${season}/${div}: missing ${input} — pull the Drive export first (see deploy-rankings skill)`);
      continue;
    }
    const legacy = JSON.parse(readFileSync(input, 'utf8'));
    const { dataset, report } = convertLegacyExport(legacy, {
      aliases: { 'Stewarts Creek': "Stewart's Creek" },
    });
    const { warnings } = parseCanonicalDataset(dataset);
    const snap = buildSnapshot(dataset, rules);
    writeFileSync(join(pub, season, `snapshot-${div}.json`), JSON.stringify(snap));
    writeFileSync(join(pub, season, `dataset-${div}.json`), JSON.stringify(dataset));
    built++;
    console.log(
      `${season} ${div}: ${snap.teams.length} teams, ${snap.meta.totalGames} games, ` +
        `ignored=${snap.meta.ignoredGames}, converged=${snap.meta.converged} ` +
        `(${snap.meta.iterations} iters), mirrored=${report.mirroredGames}, warnings=${warnings.length}`,
    );
  }
}
if (built === 0) {
  throw new Error(`no snapshots built — pull a Drive export first (see deploy-rankings skill)`);
}
