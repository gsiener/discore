import { describe, expect, it } from 'vitest';
import {
  dateWeight,
  invertRankDiff,
  projectScore,
  rankDiff,
  scoreWeight,
  seasonWeek,
  winProbability,
} from '../src/math.js';

describe('rankDiff', () => {
  it('matches USAU table for winning score 13', () => {
    const expected: [number, number][] = [
      [13, 12, 125],
      [13, 11, 229],
      [13, 10, 328],
      [13, 9, 419],
      [13, 8, 496],
      [13, 7, 558],
      [13, 6, 600],
    ];
    for (const [w, l, e] of expected) {
      expect(Math.abs(rankDiff(w, l) - e)).toBeLessThan(2);
    }
  });
  it('one-point game is always 125', () => {
    expect(rankDiff(15, 14)).toBeCloseTo(125, 0);
    expect(rankDiff(11, 10)).toBeCloseTo(125, 0);
    expect(rankDiff(8, 7)).toBeCloseTo(125, 0);
    expect(rankDiff(1, 0)).toBe(125); // degenerate: guards l/(w-1) division by zero
  });
  it('ties return 0 and caps at 600', () => {
    expect(rankDiff(13, 13)).toBe(0);
    expect(rankDiff(15, 0)).toBeLessThanOrEqual(600 + 1e-9);
    expect(rankDiff(15, 7)).toBeLessThanOrEqual(600 + 1e-9);
  });
});

describe('scoreWeight', () => {
  it('full game to 13-15 gives 1.0', () => {
    expect(scoreWeight(13, 11)).toBeCloseTo(1, 5);
    expect(scoreWeight(15, 12)).toBeCloseTo(1, 5);
  });
  it('shortened games down-weight', () => {
    expect(scoreWeight(8, 7)).toBeLessThan(1);
  });
  it('blowout floor keeps weight from collapsing', () => {
    expect(scoreWeight(13, 0)).toBeGreaterThan(scoreWeight(8, 0));
  });
});

describe('seasonWeek + dateWeight', () => {
  it('week 1 starts on first Wednesday on/after anchor', () => {
    // Club 2025: May 25 is Sunday -> week 1 = Wed May 28 through Tue Jun 3
    expect(seasonWeek('2025-05-28', 4, 25, 2025)).toBe(1);
    expect(seasonWeek('2025-06-03', 4, 25, 2025)).toBe(1);
    expect(seasonWeek('2025-06-02', 4, 25, 2025)).toBe(1);
    expect(seasonWeek('2025-06-04', 4, 25, 2025)).toBe(2);
  });
  it('date weight spans ~0.5 to 1.0', () => {
    expect(dateWeight(1, 14)).toBeCloseTo(Math.pow(2, 1 / 14 - 1), 9);
    expect(dateWeight(14, 14)).toBe(1);
  });
});

describe('predictions', () => {
  it('winProbability calibrates to rankDiff curve', () => {
    expect(winProbability(125)).toBeCloseTo(0.66, 1);
    expect(winProbability(600)).toBeCloseTo(0.95, 1);
    expect(winProbability(0)).toBe(0.5);
  });
  it('invertRankDiff floors at cap-1 for small gaps', () => {
    expect(invertRankDiff(100)).toEqual({ winner: 15, loser: 14 });
  });
  it('projectScore extrapolates past cap for simulation', () => {
    const disp = invertRankDiff(900);
    const sim = projectScore(900);
    expect(disp.loser).toBe(7);
    expect(sim.loser).toBeLessThan(7);
    expect(sim.winner).toBe(15);
  });
});
