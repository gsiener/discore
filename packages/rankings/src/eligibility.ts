import type { NormalizedGame } from './normalize.js';
import type { Ruleset } from './rules.js';

export interface EligibilityInfo {
  teamId: string;
  totalGames: number;
  ratedGames: number;
  nonLeagueGames: number;
  qualified: boolean;
  reason: string;
}

export function computeEligibility(
  teamIds: string[],
  games: NormalizedGame[],
  rules: Ruleset,
  isVarsity: (teamId: string) => boolean = () => true,
): Map<string, EligibilityInfo> {
  const out = new Map<string, EligibilityInfo>();
  for (const id of teamIds) {
    let total = 0;
    let rated = 0;
    let nonLeague = 0;
    for (const g of games) {
      if (g.winnerId !== id && g.loserId !== id) continue;
      if (!g.countsTowardMinimum) continue;
      total++;
      if (g.rated) rated++;
      if (!g.isLeague) nonLeague++;
    }
    const varsity = isVarsity(id);
    let qualified = total >= rules.eligibility.minGames && varsity;
    let reason = 'qualified';
    if (!varsity) {
      qualified = false;
      reason = 'jv';
    } else if (total < rules.eligibility.minGames) {
      qualified = false;
      reason = `fewer than ${rules.eligibility.minGames} games`;
    } else if (rules.eligibility.requireNonLeague && nonLeague < 1) {
      qualified = false;
      reason = 'league-only';
    }
    out.set(id, { teamId: id, totalGames: total, ratedGames: rated, nonLeagueGames: nonLeague, qualified, reason });
  }
  return out;
}
