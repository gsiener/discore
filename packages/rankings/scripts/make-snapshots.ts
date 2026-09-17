/**
 * Local-only snapshot publisher (NOT run in CI).
 * Converts the Drive exports in packages/web/public/rankings/ (gitignored)
 * into published snapshot + dataset JSON consumed at runtime by the
 * standings/simulate/lab pages. Runs automatically via web `predeploy`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertLegacyExport } from '../src/legacy.js';
import { parseCanonicalDataset } from '../src/dataset.js';
import { buildSnapshot } from '../src/snapshot.js';
import { HS_2025_V1 } from '../src/rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', '..', 'web', 'public', 'rankings');

for (const div of ['boys', 'girls']) {
  const input = join(pub, `data_${div}.json`);
  if (!existsSync(input)) {
    throw new Error(`missing ${input} — pull the Drive export first (see deploy-rankings skill)`);
  }
  const legacy = JSON.parse(readFileSync(input, 'utf8'));
  const { dataset, report } = convertLegacyExport(legacy, {
    aliases: { 'Stewarts Creek': "Stewart's Creek" },
  });
  const { warnings } = parseCanonicalDataset(dataset);
  const snap = buildSnapshot(dataset, HS_2025_V1);
  writeFileSync(join(pub, `snapshot-${div}.json`), JSON.stringify(snap));
  writeFileSync(join(pub, `dataset-${div}.json`), JSON.stringify(dataset));
  console.log(
    `${div}: ${snap.teams.length} teams, ${snap.meta.totalGames} games, ` +
      `ignored=${snap.meta.ignoredGames}, converged=${snap.meta.converged} ` +
      `(${snap.meta.iterations} iters), mirrored=${report.mirroredGames}, warnings=${warnings.length}`,
  );
}
