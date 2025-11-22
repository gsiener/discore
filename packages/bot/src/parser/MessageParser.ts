/**
 * Natural language parser for WhatsApp messages
 * Recognizes game events from casual chat messages
 */

import { EventType, TeamSide, parseScore } from '@scorebot/shared';

export interface ParsedMessage {
  type: EventType | null;
  team?: TeamSide;
  confidence: number; // 0-1, how confident we are in this parse
  rawMessage: string;
  defensivePlay?: 'block' | 'steal';
  startingOnOffense?: boolean; // For game start events
}

export class MessageParser {
  /**
   * Parse a message and determine if it represents a game event
   */
  parse(message: string): ParsedMessage {
    const normalized = message.toLowerCase().trim();

    // Try parsing in order of specificity
    const parsers = [
      this.parseGameStart.bind(this),
      this.parseGameEnd.bind(this),
      this.parseHalftime.bind(this),
      this.parseSecondHalfStart.bind(this),
      this.parseTimeout.bind(this),
      this.parseGoal.bind(this),
      this.parseScoreUpdate.bind(this),
    ];

    for (const parser of parsers) {
      const result = parser(normalized, message);
      if (result.type && result.confidence > 0.6) {
        return result;
      }
    }

    return { type: null, confidence: 0, rawMessage: message };
  }

  /**
   * Check if message indicates game start
   */
  private parseGameStart(normalized: string, original: string): ParsedMessage {
    const patterns = [
      /^game\s+(on|start|time|beginning)/,
      /^(start|starting|let's start)/,
      /^(here we go|let's go)/,
      /^(pull|pulling|we're pulling)/,
      /^(receiving|we're receiving)/,
      /starting on/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        // Detect if starting on offense or defense
        let startingOnOffense: boolean | undefined;
        if (/starting on o\b/.test(normalized) || /starting on offense/.test(normalized)) {
          startingOnOffense = true;
        } else if (/starting on d\b/.test(normalized) || /starting on defense/.test(normalized)) {
          startingOnOffense = false;
        }

        return {
          type: EventType.GAME_START,
          confidence: 0.8,
          rawMessage: original,
          startingOnOffense,
        };
      }
    }

    return { type: null, confidence: 0, rawMessage: original };
  }

  /**
   * Check if message indicates game end
   */
  private parseGameEnd(normalized: string, original: string): ParsedMessage {
    const patterns = [
      /game\s+(over|done|finished|ended)/,
      /(we won|we lost|gg|good game)/,
      /(final|final score|that's game)/,
      /for the game/,
      /to win (the )?(pool|game)/,
      /^(game|universe)$/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return {
          type: EventType.GAME_END,
          confidence: 0.8,
          rawMessage: original,
        };
      }
    }

    return { type: null, confidence: 0, rawMessage: original };
  }

  /**
   * Check if message indicates halftime
   */
  private parseHalftime(normalized: string, original: string): ParsedMessage {
    const patterns = [
      /halftime/,
      /half\s+time/,
      /that's\s+half/,
      /^half$/,
      /^break$/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return {
          type: EventType.HALFTIME,
          confidence: 0.9,
          rawMessage: original,
        };
      }
    }

    return { type: null, confidence: 0, rawMessage: original };
  }

  /**
   * Check if message indicates second half start
   */
  private parseSecondHalfStart(
    normalized: string,
    original: string
  ): ParsedMessage {
    const patterns = [
      /^(second half|2nd half)/,
      /^(back|we're back|game on)/,
      /^(resuming|resume)/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return {
          type: EventType.SECOND_HALF_START,
          confidence: 0.8,
          rawMessage: original,
        };
      }
    }

    return { type: null, confidence: 0, rawMessage: original };
  }

  /**
   * Check if message indicates a timeout
   */
  private parseTimeout(normalized: string, original: string): ParsedMessage {
    const patterns = [
      /^timeout/,
      /^time\s*out/,
      /^calling\s+timeout/,
      /^t\.o\./,
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        // Try to detect which team called it
        let team: TeamSide | undefined;
        if (/\b(we|us|our)\b/.test(normalized)) {
          team = TeamSide.US;
        } else if (/\b(they|them|their|opponent)\b/.test(normalized)) {
          team = TeamSide.THEM;
        }

        return {
          type: EventType.TIMEOUT,
          team,
          confidence: 0.9,
          rawMessage: original,
        };
      }
    }

    return { type: null, confidence: 0, rawMessage: original };
  }

  /**
   * Check if message indicates a goal
   */
  private parseGoal(normalized: string, original: string): ParsedMessage {
    // Check for defensive plays that lead to goals
    let defensivePlay: 'block' | 'steal' | undefined;

    if (/\bblock\b/.test(normalized)) {
      defensivePlay = 'block';
    } else if (/\bsteal\b/.test(normalized)) {
      defensivePlay = 'steal';
    }

    // Check if it's ONLY a defensive play (no score follows)
    const onlyDefensivePatterns = [
      /^\s*\bblock\b\s*$/,
      /^\s*\bsteal\b\s*$/,
      /\bend zone d\b/,
      /\bd\b(!|$)/,
    ];

    for (const pattern of onlyDefensivePatterns) {
      if (pattern.test(normalized)) {
        return { type: null, confidence: 0, rawMessage: original };
      }
    }

    // Check if opponent team name is mentioned
    const opponentPatterns = [
      /(columbia|westfield|montclair|beacon)\b.*\b(on the board|score)/i,
    ];

    for (const pattern of opponentPatterns) {
      if (pattern.test(normalized)) {
        // Opponent scored
        return {
          type: EventType.GOAL,
          team: TeamSide.THEM,
          confidence: 0.75,
          rawMessage: original,
        };
      }
    }

    // Patterns indicating we scored (with player names)
    const scoringPatterns = [
      /\bto\b.+\b\d+-\d+/,  // "player to player 5-3"
      /\d+-\d+\b.+\bto\b/,  // "5-3 player to player"
    ];

    for (const pattern of scoringPatterns) {
      if (pattern.test(normalized)) {
        return {
          type: EventType.GOAL,
          team: TeamSide.US,
          confidence: 0.85,
          rawMessage: original,
          defensivePlay,
        };
      }
    }

    // Patterns indicating we scored (general)
    const ourPatterns = [
      /^(goal|score|scored)/,
      /^we (score|got|scored)/,
      /^(nice|great|awesome)/,
      /^(point|pt)(!|$)/,
      /^(yes|yeah|yay)/,
      /^[🎯🔥💪🙌]/,
    ];

    // Patterns indicating they scored
    const theirPatterns = [
      /^they (score|scored|got)/,
      /^(opp|opponent|other team) score/,
      /^(damn|ugh|unlucky)/,
    ];

    for (const pattern of ourPatterns) {
      if (pattern.test(normalized)) {
        return {
          type: EventType.GOAL,
          team: TeamSide.US,
          confidence: 0.7,
          rawMessage: original,
          defensivePlay,
        };
      }
    }

    for (const pattern of theirPatterns) {
      if (pattern.test(normalized)) {
        return {
          type: EventType.GOAL,
          team: TeamSide.THEM,
          confidence: 0.7,
          rawMessage: original,
        };
      }
    }

    return { type: null, confidence: 0, rawMessage: original };
  }

  /**
   * Check if message contains a score update (e.g., "5-3")
   */
  private parseScoreUpdate(
    normalized: string,
    original: string
  ): ParsedMessage {
    // Check if message is ONLY a score (no other context)
    const justScorePattern = /^[\d-]+\s*$/;
    if (justScorePattern.test(normalized)) {
      return {
        type: EventType.NOTE,
        confidence: 0.65,
        rawMessage: original,
      };
    }

    const score = parseScore(normalized);

    if (score) {
      // If we found a score with other text, it's lower confidence
      // Likely just commentary mentioning the score
      return {
        type: EventType.NOTE,
        confidence: 0.5,
        rawMessage: original,
      };
    }

    return { type: null, confidence: 0, rawMessage: original };
  }

  /**
   * Check if message should be recorded as a note
   */
  shouldRecordAsNote(message: string): boolean {
    const parsed = this.parse(message);
    return parsed.type === EventType.NOTE && parsed.confidence > 0.5;
  }

  /**
   * Extract team context from previous messages
   * This is useful for understanding pronouns like "we" and "they"
   */
  inferTeamFromContext(
    message: string,
    previousMessages: string[]
  ): TeamSide | null {
    // This could be enhanced with more sophisticated context analysis
    // For now, we use simple heuristics
    const normalized = message.toLowerCase();

    if (
      normalized.includes('we ') ||
      normalized.includes('us ') ||
      normalized.includes('our ')
    ) {
      return TeamSide.US;
    }

    if (
      normalized.includes('they ') ||
      normalized.includes('them ') ||
      normalized.includes('their ') ||
      normalized.includes('opponent')
    ) {
      return TeamSide.THEM;
    }

    return null;
  }
}
