import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCanonicalDataset } from '../src/dataset.js';

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(dir, 'fixtures/small-season.json'), 'utf8'));

describe('parseCanonicalDataset', () => {
  it('accepts the small-season fixture without warnings', () => {
    const { dataset, warnings } = parseCanonicalDataset(fixture);
    expect(dataset.teams).toHaveLength(7);
    expect(dataset.games).toHaveLength(18);
    expect(warnings).toEqual([]);
  });

  it('rejects duplicate ids, unknown teams, and bad dates', () => {
    const bad = JSON.parse(JSON.stringify(fixture));
    bad.games.push({ ...bad.games[0] });
    expect(() => parseCanonicalDataset(bad)).toThrow(/duplicate game id/);

    const bad2 = JSON.parse(JSON.stringify(fixture));
    bad2.games[0].teamBId = 'ghost';
    expect(() => parseCanonicalDataset(bad2)).toThrow(/unknown teamBId/);

    const bad3 = JSON.parse(JSON.stringify(fixture));
    bad3.games[0].date = 'Oct 4';
    expect(() => parseCanonicalDataset(bad3)).toThrow(/bad date/);
  });

  it('warns (not throws) on unknown event refs', () => {
    const w = JSON.parse(JSON.stringify(fixture));
    w.games[0].eventId = 'nope';
    const { dataset, warnings } = parseCanonicalDataset(w);
    expect(warnings).toHaveLength(1);
    expect(dataset.games[0].eventId).toBeNull();
  });
});
