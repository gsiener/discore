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
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return {
          type: EventType.GAME_START,
          confidence: 0.8,
          rawMessage: original,
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
      /^game\s+(over|done|finished|ended)/,
      /^(we won|we lost|gg|good game)/,
      /^(final|final score|that's game)/,
      /^(game|universe|point)/,
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
      /^halftime/,
      /^half\s+time/,
      /^half/,
      /^break/,
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
   * Check if message indicates a goal
   */
  private parseGoal(normalized: string, original: string): ParsedMessage {
    // Patterns indicating we scored
    const ourPatterns = [
      /^(goal|score|scored)/,
      /^we (score|got|scored)/,
      /^(nice|great|awesome)/,
      /^(point|pt)/,
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
    const score = parseScore(normalized);

    if (score) {
      // If we found a score, this is likely a score update
      // We'll need context from the game state to determine if it's us or them
      return {
        type: EventType.NOTE,
        confidence: 0.6,
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
