/**
 * Stats Calculator Service
 * Calculates advanced player and game statistics from game events
 */

import {
  Game,
  GameEvent,
  EventType,
  TeamSide,
  AdvancedStats,
  PlayerStats,
  GameContextStats,
  MomentumInfo,
  HalfPerformance,
  TimeoutEfficiency,
  AggregatedPlayerStats,
  TeamTrends,
  ScoringPatterns,
  ScoringRun,
  OpponentRecord,
  StreakInfo,
  PlayerChemistry,
} from '@scorebot/shared';

export class StatsCalculator {
  // Game classification constants
  private static readonly CLOSE_GAME_THRESHOLD = 2; // Points within to consider "close"
  private static readonly BLOWOUT_THRESHOLD = 5; // Point margin to consider "blowout"

  /**
   * Calculate advanced stats for a single game
   */
  calculateGameStats(game: Game): AdvancedStats {
    const playerStats = this.calculatePlayerStats(game);
    const gameContext = this.calculateGameContextStats(game);

    return {
      gameId: game.id,
      gameDate: game.gameDate,
      tournamentName: game.tournamentName,
      ourTeamName: game.teams.us.name,
      opponentName: game.teams.them.name,
      finalScore: game.score,
      playerStats,
      gameContext,
    };
  }

  /**
   * Calculate player-level statistics from game events
   */
  private calculatePlayerStats(game: Game): PlayerStats[] {
    const playerMap = new Map<string, PlayerStats>();

    // Track point-by-point scores for plus/minus calculation
    const pointScores: Array<{ score: { us: number; them: number }; players: Set<string> }> = [];
    let currentPointPlayers = new Set<string>();

    for (const event of game.events) {
      if (!event.message) continue;

      // Extract player names from messages
      const players = this.extractPlayerNames(event.message, game);

      // Add players to current point tracking
      players.forEach(name => currentPointPlayers.add(name));

      // Process based on event type
      if (event.type === EventType.GOAL && event.team === TeamSide.US) {
        // Parse goal and assist
        const { scorer, assister } = this.parseGoalEvent(event.message, game);

        if (scorer) {
          const stats = this.getOrCreatePlayerStats(playerMap, scorer);
          stats.goals++;
          stats.touches++;
        }

        if (assister) {
          const stats = this.getOrCreatePlayerStats(playerMap, assister);
          stats.assists++;
          stats.touches++;
        }

        // Check for defensive play
        if (event.defensivePlay === 'block' && scorer) {
          const stats = this.getOrCreatePlayerStats(playerMap, scorer);
          stats.blocks++;
        } else if (event.defensivePlay === 'steal' && scorer) {
          const stats = this.getOrCreatePlayerStats(playerMap, scorer);
          stats.steals++;
        }

        // Record point completion for plus/minus
        pointScores.push({
          score: { ...event.score },
          players: new Set(currentPointPlayers),
        });
        currentPointPlayers.clear();
      } else if (event.type === EventType.GOAL && event.team === TeamSide.THEM) {
        // Opponent scored - still record for plus/minus
        pointScores.push({
          score: { ...event.score },
          players: new Set(currentPointPlayers),
        });
        currentPointPlayers.clear();

        // Track blocks/steals mentioned in opponent goals
        players.forEach(name => {
          const stats = this.getOrCreatePlayerStats(playerMap, name);
          stats.touches++;
        });
      } else {
        // For non-goal events, just track player mentions
        players.forEach(name => {
          const stats = this.getOrCreatePlayerStats(playerMap, name);
          stats.touches++;
        });
      }
    }

    // Calculate plus/minus for each player
    this.calculatePlusMinus(playerMap, pointScores, game.score);

    // Calculate points played (approximate from touches and appearances)
    playerMap.forEach(stats => {
      // Estimate: each goal/assist = 1 point, additional touches count as fractional points
      stats.pointsPlayed = Math.min(
        stats.goals + stats.assists + Math.floor(stats.touches / 2),
        game.score.us + game.score.them // Cap at total points
      );
    });

    return Array.from(playerMap.values()).sort((a, b) => {
      // Sort by goals first, then assists
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.assists - a.assists;
    });
  }

  /**
   * Extract player names from message text
   * Handles patterns like "Jake to Mason 5-3" or "Ellis block"
   */
  private extractPlayerNames(message: string, game: Game): string[] {
    const names: string[] = [];

    // Common words that aren't player names
    const commonWords = new Set([
      'Goal', 'Score', 'Point', 'Block', 'Steal', 'Timeout', 'Halftime',
      'Game', 'Nice', 'Great', 'Awesome', 'Tech', 'We', 'They', 'Us', 'Them',
      'The', 'And', 'For', 'With', 'From', 'Break', 'Hold', 'Line',
      'End', 'Zone', 'Opponent', 'Magic', 'Bard', 'Pool', 'Universe',
      'Final', 'Good', 'Win', 'Lost', 'First', 'Second', 'Half',
      'Columbia', 'Westfield', 'Montclair', 'Beacon', // Common opponent names
    ]);

    // Add team names to exclusion list
    const teamWords = new Set<string>();
    game.teams.us.name.split(/\s+/).forEach(word => {
      if (word.length > 2 && /^[A-Z]/.test(word)) {
        teamWords.add(word);
      }
    });
    game.teams.them.name.split(/\s+/).forEach(word => {
      if (word.length > 2 && /^[A-Z]/.test(word)) {
        teamWords.add(word);
      }
    });

    // Match capitalized words
    const words = message.match(/\b[A-Z][a-z]+\b/g) || [];

    for (const word of words) {
      if (!commonWords.has(word) && !teamWords.has(word) && word.length > 2) {
        names.push(word);
      }
    }

    return names;
  }

  /**
   * Parse a goal event to extract scorer and assister
   * Handles patterns like "Jake to Mason 5-3" or "Mason goal!"
   */
  private parseGoalEvent(message: string, game: Game): { scorer: string | null; assister: string | null } {
    // Pattern: "Name to Name" (assister to scorer)
    const assistPattern = /\b([A-Z][a-z]+)\s+to\s+([A-Z][a-z]+)\b/i;
    const match = message.match(assistPattern);

    if (match) {
      return {
        assister: match[1],
        scorer: match[2],
      };
    }

    // Pattern: just a name (scorer only)
    const names = this.extractPlayerNames(message, game);
    if (names.length > 0) {
      return {
        scorer: names[0],
        assister: null,
      };
    }

    return { scorer: null, assister: null };
  }

  /**
   * Get or create player stats entry
   */
  private getOrCreatePlayerStats(
    playerMap: Map<string, PlayerStats>,
    name: string
  ): PlayerStats {
    if (!playerMap.has(name)) {
      playerMap.set(name, {
        name,
        goals: 0,
        assists: 0,
        blocks: 0,
        steals: 0,
        pointsPlayed: 0,
        plusMinus: 0,
        touches: 0,
      });
    }
    return playerMap.get(name)!;
  }

  /**
   * Calculate plus/minus for each player based on point-by-point scores
   */
  private calculatePlusMinus(
    playerMap: Map<string, PlayerStats>,
    pointScores: Array<{ score: { us: number; them: number }; players: Set<string> }>,
    finalScore: { us: number; them: number }
  ): void {
    let prevScore = { us: 0, them: 0 };

    for (const point of pointScores) {
      const scoreDiff = (point.score.us - prevScore.us) - (point.score.them - prevScore.them);

      // Apply this score differential to all players on the point
      point.players.forEach(playerName => {
        const stats = playerMap.get(playerName);
        if (stats) {
          stats.plusMinus += scoreDiff;
        }
      });

      prevScore = point.score;
    }
  }

  /**
   * Calculate game context statistics
   */
  private calculateGameContextStats(game: Game): GameContextStats {
    const momentum = this.calculateMomentum(game);
    const halfPerformance = this.calculateHalfPerformance(game);
    const timeoutEfficiency = this.calculateTimeoutEfficiency(game);
    const closeGamePerformance = this.calculateCloseGamePerformance(game);

    return {
      momentum,
      halfPerformance,
      timeoutEfficiency,
      closeGamePerformance,
    };
  }

  /**
   * Calculate momentum tracking stats
   */
  private calculateMomentum(game: Game): MomentumInfo {
    let largestLead = 0;
    let largestDeficit = 0;
    let leadChanges = 0;
    let previousLeader: 'us' | 'them' | 'tied' = 'tied';
    let comebackPoints = 0;
    let maxComebackFrom = 0;
    let currentDeficit = 0;

    for (const event of game.events) {
      if (event.type !== EventType.GOAL) continue;

      const diff = event.score.us - event.score.them;

      // Track largest lead and deficit
      if (diff > 0) {
        largestLead = Math.max(largestLead, diff);
      } else if (diff < 0) {
        largestDeficit = Math.max(largestDeficit, Math.abs(diff));
      }

      // Track lead changes
      const currentLeader: 'us' | 'them' | 'tied' =
        diff > 0 ? 'us' : diff < 0 ? 'them' : 'tied';

      if (currentLeader !== previousLeader && previousLeader !== 'tied') {
        leadChanges++;
      }
      previousLeader = currentLeader;

      // Track comeback scoring
      if (event.team === TeamSide.US && diff < 0) {
        // We're behind but just scored
        comebackPoints++;
        currentDeficit = Math.abs(diff);
        maxComebackFrom = Math.max(maxComebackFrom, currentDeficit);
      } else if (event.team === TeamSide.THEM && diff < 0) {
        // They scored while ahead
        currentDeficit = Math.abs(diff);
      }
    }

    return {
      largestLead,
      largestDeficit,
      leadChanges,
      comebackPoints,
      maxComebackFrom,
    };
  }

  /**
   * Calculate first half vs second half performance
   */
  private calculateHalfPerformance(game: Game): HalfPerformance {
    const halftimeIndex = game.events.findIndex(e => e.type === EventType.HALFTIME);

    let firstHalfScore = { us: 0, them: 0 };
    let secondHalfScore = { us: 0, them: 0 };

    if (halftimeIndex >= 0) {
      const halftimeEvent = game.events[halftimeIndex];
      firstHalfScore = { ...halftimeEvent.score };
      secondHalfScore = {
        us: game.score.us - firstHalfScore.us,
        them: game.score.them - firstHalfScore.them,
      };
    } else {
      // No halftime recorded, use final score
      firstHalfScore = { ...game.score };
    }

    return {
      firstHalf: {
        ourScore: firstHalfScore.us,
        theirScore: firstHalfScore.them,
        scoreDifferential: firstHalfScore.us - firstHalfScore.them,
      },
      secondHalf: {
        ourScore: secondHalfScore.us,
        theirScore: secondHalfScore.them,
        scoreDifferential: secondHalfScore.us - secondHalfScore.them,
      },
    };
  }

  /**
   * Calculate timeout efficiency
   */
  private calculateTimeoutEfficiency(game: Game): TimeoutEfficiency {
    const ourTimeouts = game.events.filter(
      e => e.type === EventType.TIMEOUT && e.team === TeamSide.US
    );

    let timeoutsInFirstHalf = 0;
    let timeoutsInSecondHalf = 0;
    let pointsScoredAfter = 0;
    let pointsAllowedAfter = 0;

    const halftimeIndex = game.events.findIndex(e => e.type === EventType.HALFTIME);

    ourTimeouts.forEach((timeout, idx) => {
      // Determine which half
      const timeoutIndex = game.events.indexOf(timeout);
      if (halftimeIndex >= 0 && timeoutIndex < halftimeIndex) {
        timeoutsInFirstHalf++;
      } else if (halftimeIndex >= 0) {
        timeoutsInSecondHalf++;
      } else {
        timeoutsInFirstHalf++;
      }

      // Find next goal after this timeout
      const nextGoalIndex = game.events.findIndex(
        (e, i) => i > timeoutIndex && e.type === EventType.GOAL
      );

      if (nextGoalIndex >= 0) {
        const nextGoal = game.events[nextGoalIndex];
        if (nextGoal.team === TeamSide.US) {
          pointsScoredAfter++;
        } else {
          pointsAllowedAfter++;
        }
      }
    });

    const totalTimeouts = ourTimeouts.length;
    const conversionRate = totalTimeouts > 0
      ? (pointsScoredAfter / totalTimeouts) * 100
      : 0;

    return {
      totalTimeouts,
      timeoutsInFirstHalf,
      timeoutsInSecondHalf,
      pointsScoredAfterTimeout: pointsScoredAfter,
      pointsAllowedAfterTimeout: pointsAllowedAfter,
      conversionRate,
    };
  }

  /**
   * Calculate performance in close game situations (within 2 points)
   */
  private calculateCloseGamePerformance(game: Game): {
    pointsPlayedWithin2: number;
    scoreDifferentialWithin2: number;
  } {
    let pointsPlayedWithin2 = 0;
    let ourScoreWithin2 = 0;
    let theirScoreWithin2 = 0;
    let prevScore = { us: 0, them: 0 };

    for (const event of game.events) {
      if (event.type !== EventType.GOAL) continue;

      // Check if score was close before this goal
      const prevDiff = Math.abs(prevScore.us - prevScore.them);
      if (prevDiff <= StatsCalculator.CLOSE_GAME_THRESHOLD) {
        pointsPlayedWithin2++;
        if (event.team === TeamSide.US) {
          ourScoreWithin2++;
        } else {
          theirScoreWithin2++;
        }
      }

      prevScore = { ...event.score };
    }

    return {
      pointsPlayedWithin2,
      scoreDifferentialWithin2: ourScoreWithin2 - theirScoreWithin2,
    };
  }

  /**
   * Aggregate player stats across multiple games
   */
  aggregatePlayerStats(games: Game[]): AggregatedPlayerStats[] {
    const playerMap = new Map<string, AggregatedPlayerStats>();

    games.forEach(game => {
      const gameStats = this.calculatePlayerStats(game);

      gameStats.forEach(playerStat => {
        let aggregated = playerMap.get(playerStat.name);

        if (!aggregated) {
          aggregated = {
            name: playerStat.name,
            goals: 0,
            assists: 0,
            blocks: 0,
            steals: 0,
            pointsPlayed: 0,
            plusMinus: 0,
            touches: 0,
            gamesPlayed: 0,
            goalsPerGame: 0,
            assistsPerGame: 0,
            blocksPerGame: 0,
            stealsPerGame: 0,
          };
          playerMap.set(playerStat.name, aggregated);
        }

        // Aggregate stats
        aggregated.goals += playerStat.goals;
        aggregated.assists += playerStat.assists;
        aggregated.blocks += playerStat.blocks;
        aggregated.steals += playerStat.steals;
        aggregated.pointsPlayed += playerStat.pointsPlayed;
        aggregated.plusMinus += playerStat.plusMinus;
        aggregated.touches += playerStat.touches;
        aggregated.gamesPlayed++;
      });
    });

    // Calculate per-game averages
    playerMap.forEach(stats => {
      stats.goalsPerGame = stats.goals / stats.gamesPlayed;
      stats.assistsPerGame = stats.assists / stats.gamesPlayed;
      stats.blocksPerGame = stats.blocks / stats.gamesPlayed;
      stats.stealsPerGame = stats.steals / stats.gamesPlayed;
    });

    return Array.from(playerMap.values()).sort((a, b) => {
      // Sort by total goals first
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.assists - a.assists;
    });
  }

  /**
   * Calculate team trends across multiple games
   */
  calculateTeamTrends(games: Game[]): TeamTrends {
    // Sort games by date (oldest first)
    const sortedGames = [...games].sort((a, b) => {
      if (!a.gameDate || !b.gameDate) return 0;
      return a.gameDate.localeCompare(b.gameDate);
    });

    const overallRecord = this.calculateOverallRecord(sortedGames);
    const streaks = this.calculateStreaks(sortedGames);
    const scoringPatterns = this.calculateScoringPatterns(sortedGames);
    const opponentRecords = this.calculateOpponentRecords(sortedGames);
    const tournamentPerformance = this.calculateTournamentPerformance(sortedGames);
    const recentForm = this.calculateRecentForm(sortedGames, 10); // Last 10 games

    return {
      overallRecord,
      streaks,
      scoringPatterns,
      opponentRecords,
      tournamentPerformance,
      recentForm,
    };
  }

  /**
   * Calculate overall win/loss record
   */
  private calculateOverallRecord(games: Game[]): {
    wins: number;
    losses: number;
    winPercentage: number;
  } {
    let wins = 0;
    let losses = 0;

    games.forEach(game => {
      if (game.score.us > game.score.them) {
        wins++;
      } else if (game.score.them > game.score.us) {
        losses++;
      }
    });

    const totalGames = wins + losses;
    const winPercentage = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    return { wins, losses, winPercentage };
  }

  /**
   * Calculate win/loss streaks
   */
  private calculateStreaks(games: Game[]): StreakInfo {
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    const currentStreakGames: string[] = [];

    let tempWinStreak = 0;
    let tempLossStreak = 0;

    games.forEach(game => {
      const isWin = game.score.us > game.score.them;
      const isLoss = game.score.them > game.score.us;

      if (isWin) {
        tempWinStreak++;
        tempLossStreak = 0;

        if (currentStreak >= 0) {
          currentStreak++;
          currentStreakGames.push(game.id);
        } else {
          currentStreak = 1;
          currentStreakGames.length = 0;
          currentStreakGames.push(game.id);
        }

        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else if (isLoss) {
        tempLossStreak++;
        tempWinStreak = 0;

        if (currentStreak <= 0) {
          currentStreak--;
          currentStreakGames.push(game.id);
        } else {
          currentStreak = -1;
          currentStreakGames.length = 0;
          currentStreakGames.push(game.id);
        }

        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
      }
    });

    return {
      currentStreak,
      longestWinStreak,
      longestLossStreak,
      currentStreakGames,
    };
  }

  /**
   * Calculate scoring patterns across games
   */
  private calculateScoringPatterns(games: Game[]): ScoringPatterns {
    let totalPointsScored = 0;
    let totalPointsAllowed = 0;
    let longestRun: ScoringRun | null = null;
    let longestDrought = 0;
    const victoriesMargins: number[] = [];
    const defeatMargins: number[] = [];
    let blowoutWins = 0;
    let blowoutLosses = 0;
    let closeWins = 0;
    let closeLosses = 0;

    games.forEach(game => {
      totalPointsScored += game.score.us;
      totalPointsAllowed += game.score.them;

      const margin = game.score.us - game.score.them;
      const absMargin = Math.abs(margin);

      // Track margins
      if (margin > 0) {
        victoriesMargins.push(margin);
        if (margin >= StatsCalculator.BLOWOUT_THRESHOLD) blowoutWins++;
        if (margin <= StatsCalculator.CLOSE_GAME_THRESHOLD) closeWins++;
      } else if (margin < 0) {
        defeatMargins.push(absMargin);
        if (absMargin >= StatsCalculator.BLOWOUT_THRESHOLD) blowoutLosses++;
        if (absMargin <= StatsCalculator.CLOSE_GAME_THRESHOLD) closeLosses++;
      }

      // Find longest scoring run in this game
      const gameRun = this.findLongestScoringRun(game);
      if (gameRun && (!longestRun || gameRun.length > longestRun.length)) {
        longestRun = gameRun;
      }

      // Find longest drought in this game
      const gameDrought = this.findLongestScoringDrought(game);
      longestDrought = Math.max(longestDrought, gameDrought);
    });

    const averagePointsScored = games.length > 0 ? totalPointsScored / games.length : 0;
    const averagePointsAllowed = games.length > 0 ? totalPointsAllowed / games.length : 0;

    // Find most common margins
    const mostCommonMarginOfVictory = this.findMostCommonMargin(victoriesMargins);
    const mostCommonMarginOfDefeat = this.findMostCommonMargin(defeatMargins);

    return {
      averagePointsScored,
      averagePointsAllowed,
      longestScoringRun: longestRun,
      longestScoringDrought: longestDrought,
      mostCommonMarginOfVictory,
      mostCommonMarginOfDefeat,
      blowoutWins,
      blowoutLosses,
      closeWins,
      closeLosses,
    };
  }

  /**
   * Find the longest scoring run (consecutive points) in a game
   */
  private findLongestScoringRun(game: Game): ScoringRun | null {
    let longestRun: ScoringRun | null = null;
    let currentRun: { start: Score; events: GameEvent[]; length: number } | null = null;
    let prevScore = { us: 0, them: 0 };

    for (const event of game.events) {
      if (event.type !== EventType.GOAL) continue;

      if (event.team === TeamSide.US) {
        if (!currentRun) {
          currentRun = {
            start: { ...prevScore },
            events: [event],
            length: 1,
          };
        } else {
          currentRun.events.push(event);
          currentRun.length++;
        }
      } else {
        // Opponent scored, end current run
        if (currentRun && (!longestRun || currentRun.length > longestRun.length)) {
          longestRun = {
            startScore: currentRun.start,
            endScore: { ...prevScore },
            length: currentRun.length,
            events: currentRun.events,
          };
        }
        currentRun = null;
      }

      prevScore = { ...event.score };
    }

    // Check final run
    if (currentRun && (!longestRun || currentRun.length > longestRun.length)) {
      longestRun = {
        startScore: currentRun.start,
        endScore: { ...game.score },
        length: currentRun.length,
        events: currentRun.events,
      };
    }

    return longestRun;
  }

  /**
   * Find the longest scoring drought (consecutive points allowed) in a game
   */
  private findLongestScoringDrought(game: Game): number {
    let longestDrought = 0;
    let currentDrought = 0;

    for (const event of game.events) {
      if (event.type !== EventType.GOAL) continue;

      if (event.team === TeamSide.THEM) {
        currentDrought++;
        longestDrought = Math.max(longestDrought, currentDrought);
      } else {
        currentDrought = 0;
      }
    }

    return longestDrought;
  }

  /**
   * Find the most common margin in a list of margins
   */
  private findMostCommonMargin(margins: number[]): number {
    if (margins.length === 0) return 0;

    const counts = new Map<number, number>();
    margins.forEach(margin => {
      counts.set(margin, (counts.get(margin) || 0) + 1);
    });

    let mostCommon = margins[0];
    let maxCount = 0;

    counts.forEach((count, margin) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = margin;
      }
    });

    return mostCommon;
  }

  /**
   * Calculate head-to-head records against each opponent
   */
  private calculateOpponentRecords(games: Game[]): OpponentRecord[] {
    const recordMap = new Map<string, OpponentRecord>();

    games.forEach(game => {
      const opponentName = game.teams.them.name;
      let record = recordMap.get(opponentName);

      if (!record) {
        record = {
          opponentName,
          wins: 0,
          losses: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          averagePointsScored: 0,
          averagePointsAllowed: 0,
          lastGameResult: null,
          winStreak: 0,
          lossStreak: 0,
        };
        recordMap.set(opponentName, record);
      }

      const isWin = game.score.us > game.score.them;
      const isLoss = game.score.them > game.score.us;

      record.totalPointsScored += game.score.us;
      record.totalPointsAllowed += game.score.them;

      if (isWin) {
        record.wins++;
        record.lastGameResult = 'win';
        record.lossStreak = 0;
        record.winStreak++;
      } else if (isLoss) {
        record.losses++;
        record.lastGameResult = 'loss';
        record.winStreak = 0;
        record.lossStreak++;
      }

      if (game.gameDate) {
        record.lastGameDate = game.gameDate;
      }
    });

    // Calculate averages
    recordMap.forEach(record => {
      const totalGames = record.wins + record.losses;
      record.averagePointsScored = totalGames > 0 ? record.totalPointsScored / totalGames : 0;
      record.averagePointsAllowed = totalGames > 0 ? record.totalPointsAllowed / totalGames : 0;
    });

    return Array.from(recordMap.values()).sort((a, b) => {
      // Sort by total games played
      const aTotal = a.wins + a.losses;
      const bTotal = b.wins + b.losses;
      return bTotal - aTotal;
    });
  }

  /**
   * Calculate performance by tournament
   */
  private calculateTournamentPerformance(games: Game[]): Array<{
    tournamentName: string;
    wins: number;
    losses: number;
    avgPointsScored: number;
    avgPointsAllowed: number;
  }> {
    const tournamentMap = new Map<string, {
      wins: number;
      losses: number;
      totalPointsScored: number;
      totalPointsAllowed: number;
      gamesPlayed: number;
    }>();

    games.forEach(game => {
      const tournamentName = game.tournamentName || 'Unknown';
      let stats = tournamentMap.get(tournamentName);

      if (!stats) {
        stats = {
          wins: 0,
          losses: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          gamesPlayed: 0,
        };
        tournamentMap.set(tournamentName, stats);
      }

      stats.totalPointsScored += game.score.us;
      stats.totalPointsAllowed += game.score.them;
      stats.gamesPlayed++;

      if (game.score.us > game.score.them) {
        stats.wins++;
      } else if (game.score.them > game.score.us) {
        stats.losses++;
      }
    });

    return Array.from(tournamentMap.entries())
      .map(([tournamentName, stats]) => ({
        tournamentName,
        wins: stats.wins,
        losses: stats.losses,
        avgPointsScored: stats.totalPointsScored / stats.gamesPlayed,
        avgPointsAllowed: stats.totalPointsAllowed / stats.gamesPlayed,
      }))
      .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
  }

  /**
   * Get recent game results
   */
  private calculateRecentForm(games: Game[], limit: number): Array<{
    gameId: string;
    gameDate?: string;
    opponent: string;
    result: 'win' | 'loss';
    score: Score;
    margin: number;
  }> {
    return games
      .slice(-limit)
      .reverse()
      .map(game => ({
        gameId: game.id,
        gameDate: game.gameDate,
        opponent: game.teams.them.name,
        result: game.score.us > game.score.them ? 'win' as const : 'loss' as const,
        score: { ...game.score },
        margin: Math.abs(game.score.us - game.score.them),
      }));
  }

  /**
   * Calculate player chemistry - which players assist/score with each other
   */
  calculatePlayerChemistry(games: Game[]): PlayerChemistry[] {
    const chemistryMap = new Map<string, PlayerChemistry>();

    games.forEach(game => {
      // Track which players appear in each game
      const gamePlayers = new Set<string>();
      const playerGoals = new Map<string, number>();
      const assistPairs: Array<{ assister: string; scorer: string }> = [];

      game.events.forEach(event => {
        if (event.type !== EventType.GOAL || event.team !== TeamSide.US) return;

        const { scorer, assister } = this.parseGoalEvent(event.message || '', game);

        if (scorer) {
          gamePlayers.add(scorer);
          playerGoals.set(scorer, (playerGoals.get(scorer) || 0) + 1);
        }

        if (assister) {
          gamePlayers.add(assister);
        }

        if (scorer && assister) {
          assistPairs.push({ assister, scorer });
        }
      });

      // For each pair of players in this game, update chemistry stats
      const players = Array.from(gamePlayers);
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const p1 = players[i];
          const p2 = players[j];
          const key = [p1, p2].sort().join('|');

          let chemistry = chemistryMap.get(key);
          if (!chemistry) {
            chemistry = {
              player1: p1,
              player2: p2,
              gamesPlayedTogether: 0,
              goalsCombined: 0,
              assistsToEachOther: 0,
              plusMinusTogether: 0,
            };
            chemistryMap.set(key, chemistry);
          }

          chemistry.gamesPlayedTogether++;
          chemistry.goalsCombined += (playerGoals.get(p1) || 0) + (playerGoals.get(p2) || 0);

          // Count assists between these two players
          assistPairs.forEach(pair => {
            if (
              (pair.assister === p1 && pair.scorer === p2) ||
              (pair.assister === p2 && pair.scorer === p1)
            ) {
              chemistry.assistsToEachOther++;
            }
          });
        }
      }
    });

    return Array.from(chemistryMap.values())
      .filter(c => c.gamesPlayedTogether >= 2) // Only show pairs that played together multiple times
      .sort((a, b) => b.assistsToEachOther - a.assistsToEachOther);
  }
}
