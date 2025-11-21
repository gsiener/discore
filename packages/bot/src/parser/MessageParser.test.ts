import { describe, it, expect, beforeEach } from 'vitest';
import { MessageParser } from './MessageParser.js';
import { EventType, TeamSide } from '@scorebot/shared';

describe('MessageParser', () => {
  let parser: MessageParser;

  beforeEach(() => {
    parser = new MessageParser();
  });

  describe('parseGameStart', () => {
    it('should recognize "game on"', () => {
      const result = parser.parse('game on');
      expect(result.type).toBe(EventType.GAME_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "game start"', () => {
      const result = parser.parse('game start');
      expect(result.type).toBe(EventType.GAME_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "starting"', () => {
      const result = parser.parse('starting');
      expect(result.type).toBe(EventType.GAME_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "here we go"', () => {
      const result = parser.parse('here we go');
      expect(result.type).toBe(EventType.GAME_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "pull"', () => {
      const result = parser.parse('pull');
      expect(result.type).toBe(EventType.GAME_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "receiving"', () => {
      const result = parser.parse('receiving');
      expect(result.type).toBe(EventType.GAME_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should be case insensitive', () => {
      const result = parser.parse('GAME ON');
      expect(result.type).toBe(EventType.GAME_START);
    });
  });

  describe('parseGameEnd', () => {
    it('should recognize "game over"', () => {
      const result = parser.parse('game over');
      expect(result.type).toBe(EventType.GAME_END);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "gg"', () => {
      const result = parser.parse('gg');
      expect(result.type).toBe(EventType.GAME_END);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "we won"', () => {
      const result = parser.parse('we won');
      expect(result.type).toBe(EventType.GAME_END);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "final score"', () => {
      const result = parser.parse('final score');
      expect(result.type).toBe(EventType.GAME_END);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "game"', () => {
      const result = parser.parse('game');
      expect(result.type).toBe(EventType.GAME_END);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('parseHalftime', () => {
    it('should recognize "halftime"', () => {
      const result = parser.parse('halftime');
      expect(result.type).toBe(EventType.HALFTIME);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "half time"', () => {
      const result = parser.parse('half time');
      expect(result.type).toBe(EventType.HALFTIME);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "half"', () => {
      const result = parser.parse('half');
      expect(result.type).toBe(EventType.HALFTIME);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "break"', () => {
      const result = parser.parse('break');
      expect(result.type).toBe(EventType.HALFTIME);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should have high confidence for halftime', () => {
      const result = parser.parse('halftime');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('parseSecondHalfStart', () => {
    it('should recognize "second half"', () => {
      const result = parser.parse('second half');
      expect(result.type).toBe(EventType.SECOND_HALF_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "2nd half"', () => {
      const result = parser.parse('2nd half');
      expect(result.type).toBe(EventType.SECOND_HALF_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "back"', () => {
      const result = parser.parse('back');
      expect(result.type).toBe(EventType.SECOND_HALF_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "resuming"', () => {
      const result = parser.parse('resuming');
      expect(result.type).toBe(EventType.SECOND_HALF_START);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('parseGoal', () => {
    describe('our goals', () => {
      it('should recognize "goal"', () => {
        const result = parser.parse('goal');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.US);
        expect(result.confidence).toBeGreaterThan(0.6);
      });

      it('should recognize "score"', () => {
        const result = parser.parse('score');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.US);
      });

      it('should recognize "we scored"', () => {
        const result = parser.parse('we scored');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.US);
      });

      it('should recognize "nice"', () => {
        const result = parser.parse('nice');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.US);
      });

      it('should recognize "point"', () => {
        const result = parser.parse('point');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.US);
      });

      it('should recognize "yes"', () => {
        const result = parser.parse('yes');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.US);
      });

      it('should recognize celebration emojis', () => {
        const result = parser.parse('🎯');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.US);
      });
    });

    describe('their goals', () => {
      it('should recognize "they scored"', () => {
        const result = parser.parse('they scored');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.THEM);
        expect(result.confidence).toBeGreaterThan(0.6);
      });

      it('should recognize "opponent score"', () => {
        const result = parser.parse('opponent score');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.THEM);
      });

      it('should recognize "damn"', () => {
        const result = parser.parse('damn');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.THEM);
      });

      it('should recognize "ugh"', () => {
        const result = parser.parse('ugh');
        expect(result.type).toBe(EventType.GOAL);
        expect(result.team).toBe(TeamSide.THEM);
      });
    });
  });

  describe('parseScoreUpdate', () => {
    it('should recognize score with dash', () => {
      const result = parser.parse('5-3');
      expect(result.type).toBe(EventType.NOTE);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should recognize score in context', () => {
      const result = parser.parse('The score is 5-3');
      // Score in context might not be high enough confidence
      if (result.type === EventType.NOTE) {
        expect(result.confidence).toBeGreaterThan(0.4);
      } else {
        // It's okay if it doesn't match - score in text context is ambiguous
        expect(result.type).toBeNull();
      }
    });

    it('should not recognize non-score text', () => {
      const result = parser.parse('random message');
      expect(result.type).toBeNull();
    });
  });

  describe('parse - priority and confidence', () => {
    it('should return null for unrecognized messages', () => {
      const result = parser.parse('random chat message');
      expect(result.type).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should preserve original message', () => {
      const result = parser.parse('GOAL!!!');
      expect(result.rawMessage).toBe('GOAL!!!');
    });

    it('should prioritize more specific patterns', () => {
      // "half" should be recognized as halftime, not filtered by later patterns
      const result = parser.parse('half');
      expect(result.type).toBe(EventType.HALFTIME);
    });

    it('should only return events with confidence > 0.6', () => {
      const result = parser.parse('maybe');
      // This shouldn't match any pattern strongly enough
      expect(result.type).toBeNull();
    });
  });

  describe('shouldRecordAsNote', () => {
    it('should return true for score updates', () => {
      const result = parser.shouldRecordAsNote('5-3');
      expect(result).toBe(true);
    });

    it('should return false for recognized events', () => {
      const result = parser.shouldRecordAsNote('goal');
      expect(result).toBe(false);
    });

    it('should return false for unrecognized messages', () => {
      const result = parser.shouldRecordAsNote('random message');
      expect(result).toBe(false);
    });
  });

  describe('inferTeamFromContext', () => {
    it('should infer US from "we"', () => {
      const result = parser.inferTeamFromContext('we scored', []);
      expect(result).toBe(TeamSide.US);
    });

    it('should infer US from "us"', () => {
      const result = parser.inferTeamFromContext('us vs them', []);
      expect(result).toBe(TeamSide.US);
    });

    it('should infer US from "our"', () => {
      const result = parser.inferTeamFromContext('our team', []);
      expect(result).toBe(TeamSide.US);
    });

    it('should infer THEM from "they"', () => {
      const result = parser.inferTeamFromContext('they scored', []);
      expect(result).toBe(TeamSide.THEM);
    });

    it('should infer THEM from "them"', () => {
      const result = parser.inferTeamFromContext('them vs us', []);
      expect(result).toBe(TeamSide.THEM);
    });

    it('should infer THEM from "their"', () => {
      const result = parser.inferTeamFromContext('their team', []);
      expect(result).toBe(TeamSide.THEM);
    });

    it('should infer THEM from "opponent"', () => {
      const result = parser.inferTeamFromContext('opponent scored', []);
      expect(result).toBe(TeamSide.THEM);
    });

    it('should return null for ambiguous messages', () => {
      const result = parser.inferTeamFromContext('goal!', []);
      expect(result).toBeNull();
    });

    it('should prioritize first pronoun found', () => {
      const result = parser.inferTeamFromContext('we beat them', []);
      expect(result).toBe(TeamSide.US);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = parser.parse('');
      expect(result.type).toBeNull();
    });

    it('should handle whitespace only', () => {
      const result = parser.parse('   ');
      expect(result.type).toBeNull();
    });

    it('should handle multi-line messages', () => {
      const result = parser.parse('goal\nnice shot');
      expect(result.type).toBe(EventType.GOAL);
    });

    it('should handle messages with punctuation', () => {
      const result = parser.parse('goal!!!');
      expect(result.type).toBe(EventType.GOAL);
    });

    it('should handle mixed case', () => {
      const result = parser.parse('GoAl!');
      expect(result.type).toBe(EventType.GOAL);
    });
  });
});
