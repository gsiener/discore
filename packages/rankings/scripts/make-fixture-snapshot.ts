/**
 * Regenerate the web fixture snapshot from the committed canonical fixture.
 * Run: npm run fixture-snapshot --workspace=@scorebot/rankings
 * Output is committed at packages/web/src/rankings/snapshot-boys-fixture.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCanonicalDataset } from '../src/dataset.js';
import { buildSnapshot } from '../src/snapshot.js';
import { HS_2025_V1 } from '../src/rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, '..', 'tests', 'fixtures', 'small-season.json'), 'utf8'));
const { dataset, warnings } = parseCanonicalDataset(raw);
if (warnings.length) console.warn('warnings:', warnings);
const snap = buildSnapshot(dataset, HS_2025_V1, { generatedAt: '2026-01-01T00:00:00.000Z' });
const outDir = join(here, '..', '..', 'web', 'src', 'rankings');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'snapshot-boys-fixture.json'), JSON.stringify(snap, null, 2) + '\n');
console.log(`wrote fixture snapshot: ${snap.teams.length} teams, ${snap.meta.totalGames} games`);
