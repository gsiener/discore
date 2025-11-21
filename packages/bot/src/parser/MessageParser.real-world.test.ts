import { describe, it, expect, beforeEach } from 'vitest';
import { MessageParser } from './MessageParser.js';
import { EventType, TeamSide } from '@scorebot/shared';

/**
 * Tests based on real WhatsApp chat messages
 * These patterns come from actual game coverage
 */
describe('MessageParser - Real World Patterns', () => {
  let parser: MessageParser;

  beforeEach(() => {
    parser = new MessageParser();
  });

  describe('goal scoring patterns', () => {
    it('should recognize "Jed to Cyrus 1-0"', () => {
      const result = parser.parse('Jed to Cyrus 1-0');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "2-0 Jake to Marley with the first lay out of the day"', () => {
      const result = parser.parse('2-0 Jake to Marley with the first lay out of the day');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should recognize "3-0 Alex to Jed!"', () => {
      const result = parser.parse('3-0 Alex to Jed!');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should recognize "Jake to Marley. 9-1"', () => {
      const result = parser.parse('Jake to Marley. 9-1');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should recognize "Marley huck to Corbin! 11-1"', () => {
      const result = parser.parse('Marley huck to Corbin! 11-1');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should recognize "Ellis to Cyrus.8-2"', () => {
      const result = parser.parse('Ellis to Cyrus.8-2');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });
  });

  describe('just score patterns', () => {
    it('should recognize "1-1" as score update', () => {
      const result = parser.parse('1-1');
      // Just a score should be low confidence or null
      // The parser might return null or a note
      expect([null, EventType.NOTE, EventType.GOAL]).toContain(result.type);
    });

    it('should recognize "10-2"', () => {
      const result = parser.parse('10-2');
      expect([null, EventType.NOTE, EventType.GOAL]).toContain(result.type);
    });

    it('should recognize "4-2"', () => {
      const result = parser.parse('4-2');
      expect([null, EventType.NOTE, EventType.GOAL]).toContain(result.type);
    });
  });

  describe('opponent scoring patterns', () => {
    it('should recognize "Columbia on the board. 5-1"', () => {
      const result = parser.parse('Columbia on the board. 5-1');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.THEM);
    });

    it('should recognize "Westfield on the board 4-1"', () => {
      const result = parser.parse('Westfield on the board 4-1');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.THEM);
    });

    it('should recognize "Montclair score"', () => {
      const result = parser.parse('Montclair score');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.THEM);
    });
  });

  describe('defensive plays (should NOT be goals)', () => {
    it('should not recognize "Jake steal!" as a goal', () => {
      const result = parser.parse('Jake steal!');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Big steal by Jake in CJV end zone"', () => {
      const result = parser.parse('Big steal by Jake in CJV end zone');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "End zone steal by Jake"', () => {
      const result = parser.parse('End zone steal by Jake');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Hand block by Corbin!"', () => {
      const result = parser.parse('Hand block by Corbin!');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Big block Alex"', () => {
      const result = parser.parse('Big block Alex');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Foot block Marley!"', () => {
      const result = parser.parse('Foot block Marley!');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "End zone D Ellis"', () => {
      const result = parser.parse('End zone D Ellis');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Corbin D!"', () => {
      const result = parser.parse('Corbin D!');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Big D Cyrus"', () => {
      const result = parser.parse('Big D Cyrus');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Marley Slap down D!"', () => {
      const result = parser.parse('Marley Slap down D!');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "Turn"', () => {
      const result = parser.parse('Turn');
      expect(result.type).not.toBe(EventType.GOAL);
    });

    it('should not recognize "End zone D Noah SL"', () => {
      const result = parser.parse('End zone D Noah SL');
      expect(result.type).not.toBe(EventType.GOAL);
    });
  });

  describe('halftime patterns', () => {
    it('should recognize "That\'s half!"', () => {
      const result = parser.parse("That's half!");
      expect(result.type).toBe(EventType.HALFTIME);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "halftime"', () => {
      const result = parser.parse('halftime');
      expect(result.type).toBe(EventType.HALFTIME);
    });
  });

  describe('game end patterns', () => {
    it('should recognize "Ellis to Nico for the game"', () => {
      const result = parser.parse('Ellis to Nico for the game');
      expect(result.type).toBe(EventType.GAME_END);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "That\'s Game - Ellis to Jed."', () => {
      const result = parser.parse("That's Game - Ellis to Jed.");
      expect(result.type).toBe(EventType.GAME_END);
    });

    it('should recognize "Ellis to Jed to win the pool."', () => {
      const result = parser.parse('Ellis to Jed to win the pool.');
      expect(result.type).toBe(EventType.GAME_END);
    });
  });

  describe('starting patterns', () => {
    it('should recognize "Starting on O"', () => {
      const result = parser.parse('Starting on O');
      expect(result.type).toBe(EventType.GAME_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('contextual messages (should be ignored)', () => {
    it('should not recognize "Long point with lots of turns. Stay tuned."', () => {
      const result = parser.parse('Long point with lots of turns. Stay tuned.');
      // "turns" shouldn't trigger anything since it's plural and in context
      expect(result.type).toBeNull();
    });

    it('should not recognize "Games are to 13, 90 min cap for this pool"', () => {
      const result = parser.parse('Games are to 13, 90 min cap for this pool');
      expect(result.type).toBeNull();
    });

    it('should not recognize "This is a tougher game, score notwithstanding."', () => {
      const result = parser.parse('This is a tougher game, score notwithstanding.');
      expect(result.type).toBeNull();
    });

    it('should not recognize "Thanks for the coverage and photos!!!"', () => {
      const result = parser.parse('Thanks for the coverage and photos!!!');
      expect(result.type).toBeNull();
    });

    it('should not recognize "We\'re keeping your seat warm boss"', () => {
      const result = parser.parse("We're keeping your seat warm boss");
      expect(result.type).toBeNull();
    });

    it('should not recognize "Westfield time out. Things are damp here…"', () => {
      const result = parser.parse('Westfield time out. Things are damp here…');
      expect(result.type).toBeNull();
    });
  });

  describe('edge cases from real data', () => {
    it('should handle messages with extra spacing', () => {
      const result = parser.parse('4-1  Ellis to jed');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should handle lowercase player names', () => {
      const result = parser.parse('3-1 Jake to nico');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should handle edited messages marker', () => {
      const result = parser.parse('Marley huck to Corbin! 11-1 ‎<This message was edited>');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should handle descriptive goal info', () => {
      const result = parser.parse('12-3 jake to Marley, with a sky');
      expect(result.type).toBe(EventType.GOAL);
      expect(result.team).toBe(TeamSide.US);
    });

    it('should handle continuation messages', () => {
      const result = parser.parse('And then to Nico for 5-1');
      // This is tricky - "And then to" with score
      // Should probably be recognized as a goal
      expect(result.type).toBe(EventType.GOAL);
    });
  });
});
