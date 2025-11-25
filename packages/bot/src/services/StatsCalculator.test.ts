import { describe, it, expect, beforeEach } from 'vitest';
import { StatsCalculator } from './StatsCalculator.js';
import {
  Game,
  GameStatus,
  EventType,
  TeamSide,
  generateId,
} from '@scorebot/shared';

describe('StatsCalculator', () => {
  let calculator: StatsCalculator;

  beforeEach(() => {
    calculator = new StatsCalculator();
  });

  const createMockGame = (): Game => ({
    id: generateId('game'),
    status: GameStatus.FINISHED,
    teams: {
      us: { name: 'Tech', side: TeamSide.US },
      them: { name: 'Columbia', side: TeamSide.THEM },
    },
    score: { us: 0, them: 0 },
    events: [],
    startedAt: Date.now(),
    finishedAt: Date.now() + 60000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  describe('calculatePlayerStats', () => {
    it('should extract scorer and assister from goal message', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Jake to Mason 1-0',
        },
      ];
      game.score = { us: 1, them: 0 };

      const stats = calculator.calculateGameStats(game);

      expect(stats.playerStats).toHaveLength(2);

      const mason = stats.playerStats.find(p => p.name === 'Mason');
      const jake = stats.playerStats.find(p => p.name === 'Jake');

      expect(mason).toBeDefined();
      expect(mason?.goals).toBe(1);
      expect(mason?.assists).toBe(0);

      expect(jake).toBeDefined();
      expect(jake?.assists).toBe(1);
      expect(jake?.goals).toBe(0);
    });

    it('should track blocks and steals', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Ellis block, scores 1-0',
          defensivePlay: 'block',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Sarah steal, scores 2-0',
          defensivePlay: 'steal',
        },
      ];
      game.score = { us: 2, them: 0 };

      const stats = calculator.calculateGameStats(game);

      const ellis = stats.playerStats.find(p => p.name === 'Ellis');
      const sarah = stats.playerStats.find(p => p.name === 'Sarah');

      expect(ellis?.blocks).toBe(1);
      expect(ellis?.steals).toBe(0);

      expect(sarah?.steals).toBe(1);
      expect(sarah?.blocks).toBe(0);
    });

    it('should calculate points played for players', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Jake to Mason 1-0',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Jake to Mason 2-0',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 2000,
          score: { us: 3, them: 0 },
          team: TeamSide.US,
          message: 'Mason scores 3-0',
        },
      ];
      game.score = { us: 3, them: 0 };

      const stats = calculator.calculateGameStats(game);

      const mason = stats.playerStats.find(p => p.name === 'Mason');
      const jake = stats.playerStats.find(p => p.name === 'Jake');

      expect(mason?.pointsPlayed).toBeGreaterThan(0);
      expect(jake?.pointsPlayed).toBeGreaterThan(0);
    });

    it('should sort players by goals then assists', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Jake to Mason 1-0',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Ellis scores 2-0',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 2000,
          score: { us: 3, them: 0 },
          team: TeamSide.US,
          message: 'Ellis scores 3-0',
        },
      ];
      game.score = { us: 3, them: 0 };

      const stats = calculator.calculateGameStats(game);

      // Ellis should be first with 2 goals
      expect(stats.playerStats[0].name).toBe('Ellis');
      expect(stats.playerStats[0].goals).toBe(2);
    });
  });

  describe('calculateMomentum', () => {
    it('should track largest lead and deficit', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Score 1-0',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Score 2-0',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 2000,
          score: { us: 3, them: 0 },
          team: TeamSide.US,
          message: 'Score 3-0',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 3000,
          score: { us: 3, them: 1 },
          team: TeamSide.THEM,
          message: 'Score 3-1',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 4000,
          score: { us: 3, them: 2 },
          team: TeamSide.THEM,
          message: 'Score 3-2',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 5000,
          score: { us: 3, them: 3 },
          team: TeamSide.THEM,
          message: 'Score 3-3',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 6000,
          score: { us: 3, them: 4 },
          team: TeamSide.THEM,
          message: 'Score 3-4',
        },
      ];
      game.score = { us: 3, them: 4 };

      const stats = calculator.calculateGameStats(game);

      expect(stats.gameContext.momentum.largestLead).toBe(3); // We led 3-0
      expect(stats.gameContext.momentum.largestDeficit).toBe(1); // We were down 3-4
    });

    it('should track lead changes', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 1, them: 1 },
          team: TeamSide.THEM,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 2000,
          score: { us: 1, them: 2 },
          team: TeamSide.THEM,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 3000,
          score: { us: 2, them: 2 },
          team: TeamSide.US,
          message: 'Score',
        },
      ];
      game.score = { us: 2, them: 2 };

      const stats = calculator.calculateGameStats(game);

      expect(stats.gameContext.momentum.leadChanges).toBeGreaterThan(0);
    });
  });

  describe('calculateHalfPerformance', () => {
    it('should split stats by halftime', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.HALFTIME,
          timestamp: Date.now() + 2000,
          score: { us: 2, them: 0 },
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 3000,
          score: { us: 3, them: 0 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 4000,
          score: { us: 3, them: 1 },
          team: TeamSide.THEM,
          message: 'Score',
        },
      ];
      game.score = { us: 3, them: 1 };

      const stats = calculator.calculateGameStats(game);

      expect(stats.gameContext.halfPerformance.firstHalf.ourScore).toBe(2);
      expect(stats.gameContext.halfPerformance.firstHalf.theirScore).toBe(0);
      expect(stats.gameContext.halfPerformance.secondHalf.ourScore).toBe(1);
      expect(stats.gameContext.halfPerformance.secondHalf.theirScore).toBe(1);
    });
  });

  describe('calculateTimeoutEfficiency', () => {
    it('should track timeout conversion rate', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.TIMEOUT,
          timestamp: Date.now(),
          score: { us: 0, them: 0 },
          team: TeamSide.US,
          message: 'Timeout',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.TIMEOUT,
          timestamp: Date.now() + 2000,
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Timeout',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 3000,
          score: { us: 1, them: 1 },
          team: TeamSide.THEM,
          message: 'Score',
        },
      ];
      game.score = { us: 1, them: 1 };

      const stats = calculator.calculateGameStats(game);

      expect(stats.gameContext.timeoutEfficiency.totalTimeouts).toBe(2);
      expect(stats.gameContext.timeoutEfficiency.pointsScoredAfterTimeout).toBe(1);
      expect(stats.gameContext.timeoutEfficiency.pointsAllowedAfterTimeout).toBe(1);
      expect(stats.gameContext.timeoutEfficiency.conversionRate).toBe(50);
    });
  });

  describe('calculateCloseGamePerformance', () => {
    it('should track performance when game is within 2 points', () => {
      const game = createMockGame();
      game.events = [
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 2000,
          score: { us: 2, them: 1 },
          team: TeamSide.THEM,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 3000,
          score: { us: 3, them: 1 },
          team: TeamSide.US,
          message: 'Score',
        },
        {
          id: generateId('event'),
          gameId: game.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 4000,
          score: { us: 3, them: 2 },
          team: TeamSide.THEM,
          message: 'Score',
        },
      ];
      game.score = { us: 3, them: 2 };

      const stats = calculator.calculateGameStats(game);

      // First goal was 0-0 (within 2), second was 1-0 (within 2), fourth was 2-1 (within 2)
      expect(stats.gameContext.closeGamePerformance.pointsPlayedWithin2).toBeGreaterThan(0);
    });
  });

  describe('aggregatePlayerStats', () => {
    it('should aggregate stats across multiple games', () => {
      const game1 = createMockGame();
      game1.events = [
        {
          id: generateId('event'),
          gameId: game1.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Mason scores 1-0',
        },
      ];
      game1.score = { us: 1, them: 0 };

      const game2 = createMockGame();
      game2.events = [
        {
          id: generateId('event'),
          gameId: game2.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Mason scores 1-0',
        },
        {
          id: generateId('event'),
          gameId: game2.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Mason scores 2-0',
        },
      ];
      game2.score = { us: 2, them: 0 };

      const aggregated = calculator.aggregatePlayerStats([game1, game2]);

      const mason = aggregated.find(p => p.name === 'Mason');
      expect(mason).toBeDefined();
      expect(mason?.goals).toBe(3); // 1 + 2
      expect(mason?.gamesPlayed).toBe(2);
      expect(mason?.goalsPerGame).toBe(1.5);
    });

    it('should calculate per-game averages', () => {
      const game1 = createMockGame();
      game1.events = [
        {
          id: generateId('event'),
          gameId: game1.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Jake to Mason 1-0',
        },
      ];
      game1.score = { us: 1, them: 0 };

      const game2 = createMockGame();
      game2.events = [
        {
          id: generateId('event'),
          gameId: game2.id,
          type: EventType.GOAL,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
          team: TeamSide.US,
          message: 'Jake to Mason 1-0',
        },
        {
          id: generateId('event'),
          gameId: game2.id,
          type: EventType.GOAL,
          timestamp: Date.now() + 1000,
          score: { us: 2, them: 0 },
          team: TeamSide.US,
          message: 'Jake to Mason 2-0',
        },
      ];
      game2.score = { us: 2, them: 0 };

      const aggregated = calculator.aggregatePlayerStats([game1, game2]);

      const jake = aggregated.find(p => p.name === 'Jake');
      expect(jake).toBeDefined();
      expect(jake?.assists).toBe(3);
      expect(jake?.gamesPlayed).toBe(2);
      expect(jake?.assistsPerGame).toBe(1.5);
    });
  });
});
