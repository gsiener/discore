/**
 * Versioned rulesets. Gist values are defaults; HS policy is explicit.
 * Gist ref: hayes/efb82329577cd5d5fdf7043b39681298 (pinned 2026-09-01).
 */

export type SeasonLevel = 'Club' | 'College' | 'HS';

export interface SeasonCalendar {
  level: SeasonLevel;
  /** Year of season start. HS "2025-26" -> 2025. Club 2025 -> 2025. */
  seasonYear: number;
  /** Anchor for week 1: first Wednesday on/after (month 0-indexed, day). */
  anchorMonth: number;
  anchorDay: number;
  /** Last regular-season week present in data (n). Postseason clamps to 1.0. */
  lastRegularWeek?: number | null;
}

export interface BlowoutRule {
  ratingGap: number; // 600
  minRetainedGames: number; // 5
  twoSidedExclude: boolean; // true = compatibility choice, documented
}

export interface EligibilityRule {
  minGames: number;
  requireNonLeague: boolean;
  countUSOpenInternationalTowardMinimum: boolean;
  forfeitPenaltyThreshold?: number | null; // null = no penalty (HS default)
  forfeitPenaltyPoints?: number;
}

export interface Ruleset {
  version: string; // e.g. "HS_2025_V1"
  season: string;
  calendar: SeasonCalendar;
  seriesMultipliers: {
    regular: number;
    sectionals: number;
    regionals: number;
    nationals: number;
  };
  blowout: BlowoutRule;
  eligibility: EligibilityRule;
  solver: {
    startRating: number;
    rmsTolerance: number;
    maxIterations: number;
  };
  winProbScale: number; // 200 default
  confidenceMinGamesLow: number; // <7 => low
  confidenceMinGamesHigh: number; // >=10 + sd<=median => high
  label: string; // "unofficial HS adaptation"
}

export const CLUB_DEFAULT_CALENDAR = (seasonYear: number): SeasonCalendar => ({
  level: 'Club',
  seasonYear,
  anchorMonth: 4, // May
  anchorDay: 25,
});

export const COLLEGE_DEFAULT_CALENDAR = (seasonYear: number): SeasonCalendar => ({
  level: 'College',
  seasonYear,
  anchorMonth: 0, // January
  anchorDay: 1,
});

/** HS academic year: fall start. Configurable; default Aug 1 anchor. */
export const HS_DEFAULT_CALENDAR = (seasonYear: number): SeasonCalendar => ({
  level: 'HS',
  seasonYear,
  anchorMonth: 7, // August
  anchorDay: 1,
});

export const HS_2025_V1: Ruleset = {
  version: 'HS_2025_V1',
  season: '2025-26',
  calendar: HS_DEFAULT_CALENDAR(2025),
  seriesMultipliers: { regular: 1.0, sectionals: 1.0, regionals: 1.0, nationals: 1.0 },
  blowout: { ratingGap: 600, minRetainedGames: 5, twoSidedExclude: true },
  eligibility: {
    minGames: 5,
    requireNonLeague: true,
    countUSOpenInternationalTowardMinimum: false,
    forfeitPenaltyThreshold: null,
    forfeitPenaltyPoints: 0,
  },
  solver: { startRating: 1000, rmsTolerance: 1e-5, maxIterations: 1000 },
  winProbScale: 200,
  confidenceMinGamesLow: 7,
  confidenceMinGamesHigh: 10,
  label: 'unofficial HS adaptation',
};

export const CLUB_2025: Ruleset = {
  version: 'CLUB_2025',
  season: '2025',
  calendar: CLUB_DEFAULT_CALENDAR(2025),
  seriesMultipliers: { regular: 1.0, sectionals: 1.2, regionals: 1.5, nationals: 2.0 },
  blowout: { ratingGap: 600, minRetainedGames: 5, twoSidedExclude: true },
  eligibility: {
    minGames: 10,
    requireNonLeague: false,
    countUSOpenInternationalTowardMinimum: true,
    forfeitPenaltyThreshold: null,
    forfeitPenaltyPoints: 0,
  },
  solver: { startRating: 1000, rmsTolerance: 1e-5, maxIterations: 1000 },
  winProbScale: 200,
  confidenceMinGamesLow: 7,
  confidenceMinGamesHigh: 10,
  label: 'USAU club adaptation',
};
