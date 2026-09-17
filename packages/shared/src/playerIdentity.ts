/**
 * Player Identity — the single home for player-name knowledge.
 *
 * Name aliases, Forced Turn note detection, and defensive-play attribution
 * live behind this one seam. Readers: the bot's PlayerNameParser and
 * StatsCalculator, and the shared Point Ledger (which cannot import from
 * the bot package, so the seam lives here in shared).
 *
 * Two functions, two jobs:
 * - isForcedTurnNote: did a Forced Turn happen this point? (broad boolean)
 * - parseDefensivePlayNote: who gets credited? (narrow attribution)
 */

export interface DefensivePlayCredit {
  name: string;
  play: 'block' | 'steal';
}

/** Player name aliases (formal/chat name -> preferred roster name). */
export const NAME_ALIASES: Record<string, string> = {
  'Thaddeus': 'Nate',
  'Dock': 'Noah',
};

export function normalizePlayerName(name: string): string {
  return NAME_ALIASES[name] ?? name;
}

/** Match note messages like "Mason block", "Theo steal", "Mason foot block". */
const FORCED_TURN_NOTE_PATTERN = /^[A-Z][a-z]+\b.*\b(?:block|steal)\b/;

export function isForcedTurnNote(message: string | undefined): boolean {
  if (!message) return false;
  return FORCED_TURN_NOTE_PATTERN.test(message);
}

/**
 * Words that describe a play, never a player: "Foot block Marley" credits
 * Marley, not a phantom player named Foot.
 */
export const PLAY_DESCRIPTORS = ['diving', 'foot', 'hand', 'big'];

const PLAY_DESCRIPTOR_PATTERN = PLAY_DESCRIPTORS.join('|');

// [leading name] [descriptor] play [by name | trailing name]
const BLOCK_CREDIT_PATTERN = new RegExp(
  `^([A-Z][a-z]+)?\\s*(?:(?:${PLAY_DESCRIPTOR_PATTERN})\\s+)?block\\b(?:\\s+by\\s+([A-Z][a-z]+)|\\s+([A-Z][a-z]+))?`
);
const STEAL_CREDIT_PATTERN = new RegExp(
  `^([A-Z][a-z]+)?\\s*(?:(?:${PLAY_DESCRIPTOR_PATTERN})\\s+)?steal\\b(?:\\s+by\\s+([A-Z][a-z]+)|\\s+([A-Z][a-z]+))?`
);

function creditFromMatch(
  match: RegExpMatchArray,
  play: 'block' | 'steal'
): DefensivePlayCredit | null {
  const [, lead, byName, trailingName] = match;
  if (lead && !PLAY_DESCRIPTORS.includes(lead.toLowerCase())) {
    return { name: normalizePlayerName(lead), play };
  }
  const trailer = byName ?? trailingName;
  if (trailer) return { name: normalizePlayerName(trailer), play };
  return null;
}

/**
 * Attribute a defensive note to a player ("Ellis block" -> Ellis + block),
 * applying name aliases. Returns null when no player can be credited.
 */
export function parseDefensivePlayNote(message: string | undefined): DefensivePlayCredit | null {
  if (!message) return null;
  const lower = message.toLowerCase();
  if (lower.includes('block')) {
    const match = message.match(BLOCK_CREDIT_PATTERN);
    if (match) return creditFromMatch(match, 'block');
  } else if (lower.includes('steal')) {
    const match = message.match(STEAL_CREDIT_PATTERN);
    if (match) return creditFromMatch(match, 'steal');
  }
  return null;
}
