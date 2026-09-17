import { describe, it, expect } from 'vitest';
import { normalizePlayerName, isForcedTurnNote, parseDefensivePlayNote } from './playerIdentity.js';
import { toSummaryStats, deriveForcedTurns, deriveCleanHolds } from './gameSummary.js';

describe('playerIdentity seam', () => {
  it('normalizes aliases', () => {
    expect(normalizePlayerName('Dock')).toBe('Noah');
    expect(normalizePlayerName('Thaddeus')).toBe('Nate');
    expect(normalizePlayerName('Mason')).toBe('Mason');
  });

  it('detects forced-turn notes broadly', () => {
    expect(isForcedTurnNote('Mason block')).toBe(true);
    expect(isForcedTurnNote('Theo steal')).toBe(true);
    expect(isForcedTurnNote('Mason foot block')).toBe(true);
    expect(isForcedTurnNote('Game to 11')).toBe(false);
    expect(isForcedTurnNote(undefined)).toBe(false);
  });

  it('attributes defensive plays with aliases applied', () => {
    expect(parseDefensivePlayNote('Ellis block')).toEqual({ name: 'Ellis', play: 'block' });
    expect(parseDefensivePlayNote('Sarah steal')).toEqual({ name: 'Sarah', play: 'steal' });
    expect(parseDefensivePlayNote('Dock block')).toEqual({ name: 'Noah', play: 'block' });
    expect(parseDefensivePlayNote('Game to 11')).toBeNull();
    expect(parseDefensivePlayNote('NSL block')).toBeNull();
  });

  it('attributes middle descriptors to the leading name', () => {
    expect(parseDefensivePlayNote('Mason foot block')).toEqual({ name: 'Mason', play: 'block' });
    expect(parseDefensivePlayNote('Nico hand block')).toEqual({ name: 'Nico', play: 'block' });
  });

  it('never credits a descriptor as a player', () => {
    expect(parseDefensivePlayNote('Foot block Marley!')).toEqual({ name: 'Marley', play: 'block' });
    expect(parseDefensivePlayNote('Hand block by Corbin!')).toEqual({ name: 'Corbin', play: 'block' });
    expect(parseDefensivePlayNote('Big block Alex')).toEqual({ name: 'Alex', play: 'block' });
    expect(parseDefensivePlayNote('Big steal by Jake')).toEqual({ name: 'Jake', play: 'steal' });
  });
});

describe('gameSummary seam', () => {
  const counts = {
    oLinePoints: 10, oLineHolds: 8, oLineDirtyHolds: 2,
    dLinePoints: 8, dLineBreaks: 3, dLineFailedConversions: 2,
  };

  it('derives forced turns and clean holds once', () => {
    expect(deriveForcedTurns(counts)).toBe(5);
    expect(deriveCleanHolds(counts)).toBe(6);
  });

  it('derives opponent numbers by symmetry', () => {
    const summary = toSummaryStats(counts, 1);
    expect(summary.us.forcedTurns).toBe(5);
    expect(summary.us.dirtyHolds).toBe(2);
    expect(summary.them.holds).toBe(5); // dPoints - dBreaks
    expect(summary.them.breaks).toBe(2); // oPoints - oHolds
    expect(summary.gameCount).toBe(1);
  });
});
