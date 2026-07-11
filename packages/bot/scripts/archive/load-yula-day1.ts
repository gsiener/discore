/**
 * Load YULA Day 1 games (3/21/26)
 * Game 1: Tech Support vs Montclair — 9-7 W
 */

const API_URL = process.env.API_URL || 'https://scorebot-api.siener.workers.dev';

/** Convert "H:MM:SS AM/PM" EDT to Unix ms (EDT = UTC-4, DST active) */
function edt(time: string): number {
  const match = time.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) throw new Error(`Invalid time: ${time}`);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const period = match[4].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return new Date(Date.UTC(2026, 2, 21, hours + 4, minutes, seconds)).getTime();
}

type Event = {
  type: string;
  team?: string;
  message?: string;
  defensivePlay?: 'block' | 'steal';
  startingOnOffense?: boolean;
  timestamp: number;
};

async function addEvent(gameId: string, event: Event) {
  const res = await fetch(`${API_URL}/games/${gameId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to add event: ${res.status} ${text}`);
  }
  return res.json();
}

async function loadGame(chatId: string, opponent: string, gameOrder: number, events: Event[]) {
  console.log(`\n=== Loading Game ${gameOrder}: Tech Support vs ${opponent} ===`);

  const createRes = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      ourTeamName: 'Tech Support',
      opponentName: opponent,
      tournamentName: 'YULA',
      gameDate: '2026-03-21',
      gameOrder,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`Done! ${events.length} events loaded.`);
  return game.id;
}

async function main() {
  console.log(`Using API: ${API_URL}`);

  // === GAME 1: Tech Support vs Montclair — 9-7 W ===
  const game1Events: Event[] = [
    { type: 'game_start', startingOnOffense: true, timestamp: edt('8:29:54 AM') },

    // Point 1: 1-0 Tech (Cyrus steal → Ellis to Corbin)
    { type: 'note', message: 'Cyrus steal', timestamp: edt('8:32:57 AM') },
    { type: 'goal', team: 'us', message: 'Ellis to Corbin', defensivePlay: 'steal', timestamp: edt('8:34:11 AM') },

    // Point 2: 1-1 Montclair (Toby block but they still scored)
    { type: 'note', message: 'Toby block', timestamp: edt('8:36:50 AM') },
    { type: 'goal', team: 'them', message: '1-1', timestamp: edt('8:37:47 AM') },

    // Point 3: 2-1 Tech (Ellis deep to Corbin)
    { type: 'goal', team: 'us', message: 'Ellis deep to Corbin', timestamp: edt('8:39:53 AM') },

    // Point 4: 3-1 Tech (Toby block → Mason deep to Jake)
    { type: 'note', message: 'Toby block', timestamp: edt('8:42:25 AM') },
    { type: 'goal', team: 'us', message: 'Mason deep to Jake', defensivePlay: 'block', timestamp: edt('8:43:06 AM') },

    // Point 5: 3-2 Montclair
    { type: 'goal', team: 'them', message: '3-2', timestamp: edt('8:46:23 AM') },

    // Point 6: 4-2 Tech (Ellis to Cyrus)
    { type: 'goal', team: 'us', message: 'Ellis to Cyrus', timestamp: edt('8:48:46 AM') },

    // Point 7: 4-3 Montclair
    { type: 'goal', team: 'them', message: '4-3', timestamp: edt('8:51:37 AM') },

    // Point 8: 5-3 Tech (Gus block → Ellis to Alex)
    { type: 'note', message: 'Gus block', timestamp: edt('8:56:55 AM') },
    { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'block', timestamp: edt('8:57:12 AM') },

    // Point 9: 6-3 Tech (Jake steal, Jake block → Mason huck to Jake)
    { type: 'note', message: 'Jake steal', timestamp: edt('8:59:59 AM') },
    { type: 'note', message: 'Jake block', timestamp: edt('9:02:09 AM') },
    { type: 'goal', team: 'us', message: 'Mason huck to Jake', defensivePlay: 'block', timestamp: edt('9:04:55 AM') },

    // HALFTIME 6-3
    { type: 'halftime', timestamp: edt('9:07:03 AM') },

    // SECOND HALF
    { type: 'second_half_start', timestamp: edt('9:13:00 AM') },

    // Point 10: 6-4 Montclair (Teyo block, Toby block but they still scored)
    { type: 'note', message: 'Teyo block', timestamp: edt('9:14:09 AM') },
    { type: 'note', message: 'Toby block', timestamp: edt('9:14:35 AM') },
    { type: 'goal', team: 'them', message: '6-4', timestamp: edt('9:16:11 AM') },

    // Point 11: 6-5 Montclair
    { type: 'goal', team: 'them', message: '6-5', timestamp: edt('9:20:11 AM') },

    // Point 12: 6-6 Montclair
    { type: 'goal', team: 'them', message: '6-6', timestamp: edt('9:29:35 AM') },

    // Timeout Tech
    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('9:30:16 AM') },

    // Point 13: 7-6 Tech (Jake to Mason)
    { type: 'goal', team: 'us', message: 'Jake to Mason', timestamp: edt('9:36:50 AM') },

    // Note: 7-7 was posted then corrected — not a score
    { type: 'note', message: 'Correction: 7-7 was not a score, still 7-6', timestamp: edt('9:43:03 AM') },

    // Point 14: 8-6 Tech (Toby block → Toby to Jake)
    { type: 'note', message: 'Toby block', timestamp: edt('9:43:21 AM') },
    { type: 'goal', team: 'us', message: 'Toby to Jake', defensivePlay: 'block', timestamp: edt('9:43:47 AM') },

    // Note: soft cap
    { type: 'note', message: 'Soft cap in effect, game to 9', timestamp: edt('9:44:24 AM') },

    // Point 15: 8-7 Montclair
    { type: 'goal', team: 'them', message: '8-7', timestamp: edt('9:46:16 AM') },

    // Point 16: 9-7 Tech — GAME WINNER (Alex to Nico)
    { type: 'goal', team: 'us', message: 'Alex to Nico', timestamp: edt('9:50:00 AM') },

    // GAME END
    { type: 'game_end', timestamp: edt('9:50:00 AM') },
  ];

  await loadGame('yula-montclair-2026-03-21', 'Montclair', 1, game1Events);
}

main().catch(console.error);
