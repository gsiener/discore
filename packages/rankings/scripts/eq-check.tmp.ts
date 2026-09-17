import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
console.log('hello');
EOF npx tsx packages/rankings/scripts/eq-check.tmp.ts; echo "exit=$?"; rm packages/rankings/scripts/eq-check.tmp.ts