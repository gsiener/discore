/**
 * Player Name Parser
 * Extracts player names and parses goal events from message text
 */

import { Game } from '@scorebot/shared';

export class PlayerNameParser {
  // Throw/play descriptors that are not player names
  static readonly THROW_DESCRIPTORS = [
    'hammer', 'deep', 'greatest', 'blade', 'huck', 'diving', 'tipped', 'sky',
  ];

  // Pre-compiled patterns for parseGoalEvent
  static readonly THROW_DESCRIPTOR_PATTERN = PlayerNameParser.THROW_DESCRIPTORS.join('|');
  static readonly ASSIST_PATTERN = new RegExp(
    `\\b([A-Z][a-z]+)\\s+(?:(?:${PlayerNameParser.THROW_DESCRIPTOR_PATTERN})\\s+)?to\\s+([A-Z][a-z]+)\\b`,
    'i'
  );
  static readonly DESCRIPTOR_CHECK = new RegExp(
    `^(?:${PlayerNameParser.THROW_DESCRIPTOR_PATTERN})$`,
    'i'
  );

  // Common words that aren't player names (hoisted to avoid per-call Set creation)
  static readonly COMMON_WORDS = new Set([
    'Goal', 'Score', 'Point', 'Block', 'Steal', 'Timeout', 'Halftime',
    'Game', 'Nice', 'Great', 'Awesome', 'Tech', 'We', 'They', 'Us', 'Them',
    'The', 'And', 'For', 'With', 'From', 'Break', 'Hold', 'Line',
    'End', 'Zone', 'Opponent', 'Magic', 'Bard', 'Pool', 'Universe',
    'Final', 'Good', 'Win', 'Lost', 'First', 'Second', 'Half',
    'Columbia', 'Westfield', 'Montclair', 'Beacon',
    ...PlayerNameParser.THROW_DESCRIPTORS.map(d => d.charAt(0).toUpperCase() + d.slice(1)),
    'Redux', 'Repeat', 'After', 'Insane', 'Sorry',
    'Soft', 'Cap', 'Correction', 'Playing', 'Leaping',
    'Stuy', 'Wiss', 'Lex',
  ]);

  /**
   * Extract player names from message text
   * Handles patterns like "Jake to Mason 5-3" or "Ellis block"
   */
  extractPlayerNames(message: string, game: Game): string[] {
    const names: string[] = [];

    // Add team names to exclusion list (split on whitespace and hyphens)
    const teamWords = new Set<string>();
    game.teams.us.name.split(/[\s\-]+/).forEach(word => {
      if (word.length > 2 && /^[A-Z]/.test(word)) {
        teamWords.add(word);
      }
    });
    game.teams.them.name.split(/[\s\-]+/).forEach(word => {
      if (word.length > 2 && /^[A-Z]/.test(word)) {
        teamWords.add(word);
      }
    });

    // Match capitalized words
    const words = message.match(/\b[A-Z][a-z]+\b/g) || [];

    for (const word of words) {
      if (!PlayerNameParser.COMMON_WORDS.has(word) && !teamWords.has(word) && word.length > 2) {
        names.push(word);
      }
    }

    return names;
  }

  /**
   * Parse a goal event to extract scorer and assister
   * Handles patterns like "Jake to Mason", "Mason hammer to Alex", "Nico deep to Cyrus"
   */
  parseGoalEvent(message: string, game: Game): { scorer: string | null; assister: string | null } {
    const match = message.match(PlayerNameParser.ASSIST_PATTERN);

    if (match && !PlayerNameParser.DESCRIPTOR_CHECK.test(match[1])) {
      return { assister: match[1], scorer: match[2] };
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
}
