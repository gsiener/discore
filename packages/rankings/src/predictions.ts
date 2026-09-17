import { invertRankDiff, projectScore, winProbability } from './math.js';

export interface MatchupPreview {
  teamAId: string;
  teamBId: string;
  ratingA: number;
  ratingB: number;
  diff: number; // A - B
  favoriteId: string | null;
  winProbA: number;
  displayScore: { winner: string; winnerGoals: number; loserGoals: number };
  simulationScore: { winner: string; winnerGoals: number; loserGoals: number };
  heuristic: boolean;
}

export function previewMatchup(
  teamAId: string,
  teamBId: string,
  ratingA: number,
  ratingB: number,
  opts: { cap?: number; scale?: number } = {},
): MatchupPreview {
  const cap = opts.cap ?? 15;
  const scale = opts.scale ?? 200;
  const diff = ratingA - ratingB;
  const winProbA = winProbability(diff, scale);
  const favoriteId = diff === 0 ? null : diff > 0 ? teamAId : teamBId;
  const disp = invertRankDiff(diff, cap);
  const sim = projectScore(diff, cap);
  const favIsA = diff >= 0;
  return {
    teamAId,
    teamBId,
    ratingA,
    ratingB,
    diff,
    favoriteId,
    winProbA,
    displayScore: {
      winner: favIsA ? teamAId : teamBId,
      winnerGoals: disp.winner,
      loserGoals: disp.loser,
    },
    simulationScore: {
      winner: favIsA ? teamAId : teamBId,
      winnerGoals: sim.winner,
      loserGoals: sim.loser,
    },
    heuristic: true,
  };
}
