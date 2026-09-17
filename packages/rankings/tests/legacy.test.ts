import { describe, expect, it } from 'vitest';
import { convertLegacyExport, type LegacyExport } from '../src/legacy.js';

const mini: LegacyExport = {
  season: '2025-26',
  division: 'boys',
  lastUpdated: '2026-06-15',
  tournaments: {
    seattle: { name: 'HS Bx Seattle Invite' },
    'fall-league': { name: 'Fall League', league: true },
  },
  teams: [
    {
      name: 'Albany Cougars',
      games: [
        { opponent: 'Lincoln Lynx', result: 'W', score: '13-3', tournament: 'HS Bx Seattle Invite', date: 'Oct 4' },
        { opponent: 'Nathan Hale', result: 'W', score: '13-4', tournament: 'HS Bx Seattle Invite', date: 'Oct 4' },
      ],
    },
    {
      name: 'Lincoln Lynx',
      games: [
        { opponent: 'Albany Cougars', result: 'L', score: '3-13', tournament: 'HS Bx Seattle Invite', date: 'Oct 4' },
        { opponent: 'Mystery Club', result: 'W', score: '13-10', tournament: 'Fall League', date: 'Mar 8' },
      ],
    },
    { name: 'Nathan Hale', games: [] },
  ],
};

describe('convertLegacyExport', () => {
  it('collapses mirrored logs and resolves years by season', () => {
    const { dataset, report } = convertLegacyExport(mini);
    // 4 log entries -> Albany/Lynx + Albany/Hale mirrored? Hale log empty, so:
    // Albany-Lynx mirrored (2 entries -> 1 game), Albany-Hale singleton, Lynx-Mystery singleton
    expect(dataset.games).toHaveLength(3);
    expect(report.mirroredGames).toBe(1);
    expect(report.singletonGames).toBe(2);
    const dates = new Map(dataset.games.map((g) => [g.id, g.date]));
    expect([...dates.values()]).toContain('2025-10-04');
    expect([...dates.values()]).toContain('2026-03-08'); // spring -> fallYear+1
  });

  it('creates external teams for unknown opponents and maps league flags', () => {
    const { dataset, report } = convertLegacyExport(mini);
    expect(report.externalTeams).toContain('Mystery Club');
    const ext = dataset.teams.find((t) => t.displayName === 'Mystery Club')!;
    expect(ext.external).toBe(true);
    expect(dataset.events['fall-league'].league).toBe(true);
  });

  it('team perspective scores orient to winner correctly', () => {
    const { dataset } = convertLegacyExport(mini);
    const g = dataset.games.find(
      (x) => x.teamAId === 'albany-cougars' && x.teamBId === 'lincoln-lynx',
    )!;
    expect([g.scoreA, g.scoreB]).toEqual([13, 3]);
  });
});
