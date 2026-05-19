import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerNameParser } from './PlayerNameParser.js';
import { Game, GameStatus, TeamSide, generateId } from '@scorebot/shared';

describe('PlayerNameParser', () => {
  let parser: PlayerNameParser;

  const createMockGame = (): Game => ({
    id: generateId('game'),
    status: GameStatus.FIRST_HALF,
    teams: {
      us: { name: 'Tech', side: TeamSide.US },
      them: { name: 'Columbia', side: TeamSide.THEM },
    },
    score: { us: 0, them: 0 },
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  beforeEach(() => {
    parser = new PlayerNameParser();
  });

  describe('parseGoalEvent', () => {
    it('should parse "Jake to Mason" as assister=Jake, scorer=Mason', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Jake to Mason', game);
      expect(result.scorer).toBe('Mason');
      expect(result.assister).toBe('Jake');
    });

    it('should parse "Mason hammer to Asher" with Hammer as descriptor, not a player', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Mason hammer to Asher', game);
      expect(result.scorer).toBe('Asher');
      expect(result.assister).toBe('Mason');
    });

    it('should parse "Nico deep to Cyrus" with deep as descriptor', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Nico deep to Cyrus', game);
      expect(result.scorer).toBe('Cyrus');
      expect(result.assister).toBe('Nico');
    });

    it('should parse "Ellis blade to Alex" with blade as descriptor', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Ellis blade to Alex', game);
      expect(result.scorer).toBe('Alex');
      expect(result.assister).toBe('Ellis');
    });

    it('should parse "Mason greatest to Nico" with greatest as descriptor', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Mason greatest to Nico', game);
      expect(result.scorer).toBe('Nico');
      expect(result.assister).toBe('Mason');
    });

    it('should parse "Ellis to diving Cyrus" with diving as a receiver descriptor', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Ellis to diving Cyrus', game);
      expect(result.scorer).toBe('Cyrus');
      expect(result.assister).toBe('Ellis');
    });

    it('should parse "Toby to leaping Mason" with leaping as a receiver descriptor', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Toby to leaping Mason', game);
      expect(result.scorer).toBe('Mason');
      expect(result.assister).toBe('Toby');
    });

    it('should parse "Jake scores" as scorer=Jake with no assister', () => {
      const game = createMockGame();
      const result = parser.parseGoalEvent('Jake scores', game);
      expect(result.scorer).toBe('Jake');
      expect(result.assister).toBeNull();
    });
  });

  describe('extractPlayerNames', () => {
    it('should extract Jake and Mason from "Jake to Mason 5-3" and exclude "Score"', () => {
      const game = createMockGame();
      const names = parser.extractPlayerNames('Jake to Mason 5-3', game);
      expect(names).toContain('Jake');
      expect(names).toContain('Mason');
      expect(names).not.toContain('Score');
    });

    it('should return empty for "Hammer goal" since Hammer is a descriptor', () => {
      const game = createMockGame();
      const names = parser.extractPlayerNames('Hammer goal', game);
      expect(names).toEqual([]);
    });

    it('should extract only Ellis from "Ellis block" since Block is excluded', () => {
      const game = createMockGame();
      const names = parser.extractPlayerNames('Ellis block', game);
      expect(names).toContain('Ellis');
      expect(names).not.toContain('Block');
      expect(names).toHaveLength(1);
    });
  });
});
