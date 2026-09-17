/**
 * Game Summary — the single derivation of the side-by-side Us-vs-Them panel.
 *
 * Forced Turn and Dirty Hold display math used to be computed twice, once per
 * package (bot aggregates, web panels). Both now read from this seam, next to
 * the Point Ledger it derives from. See CONTEXT.md ("Game Summary").
 */

export interface LineStatCounts {
  oLinePoints: number;
  oLineHolds: number;
  oLineDirtyHolds: number;
  dLinePoints: number;
  dLineBreaks: number;
  dLineFailedConversions: number;
}

export interface SummaryStats {
  us: {
    holds: number;
    oPoints: number;
    breaks: number;
    dPoints: number;
    dirtyHolds: number; // holds where we turned it over but got it back
    forcedTurns: number; // breaks + failed conversions (logged)
  };
  them: {
    holds: number;
    oPoints: number;
    breaks: number;
    dPoints: number;
  };
  gameCount: number;
}

/** Breaks + failed conversions: every point where we forced a turn. */
export function deriveForcedTurns(counts: LineStatCounts): number {
  return counts.dLineBreaks + counts.dLineFailedConversions;
}

/** Holds minus the sloppy ones. */
export function deriveCleanHolds(counts: LineStatCounts): number {
  return counts.oLineHolds - counts.oLineDirtyHolds;
}

/**
 * Build the panel stats. Opponent numbers come from symmetry with our lines:
 * their holds are our D-line points where they scored, and so on. Accepts any
 * LineStats-shaped object — per-game LineStats or season AggregateLineStats.
 */
export function toSummaryStats(line: LineStatCounts, gameCount: number): SummaryStats {
  const themHolds = line.dLinePoints - line.dLineBreaks;
  const themOPoints = line.dLinePoints;
  const themBreaks = line.oLinePoints - line.oLineHolds;
  const themDPoints = line.oLinePoints;
  return {
    us: {
      holds: line.oLineHolds,
      oPoints: line.oLinePoints,
      breaks: line.dLineBreaks,
      dPoints: line.dLinePoints,
      dirtyHolds: line.oLineDirtyHolds,
      forcedTurns: deriveForcedTurns(line),
    },
    them: {
      holds: themHolds,
      oPoints: themOPoints,
      breaks: themBreaks,
      dPoints: themDPoints,
    },
    gameCount,
  };
}
