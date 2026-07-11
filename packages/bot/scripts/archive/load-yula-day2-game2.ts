/**
 * Load YULA Day 2 Game 2: Tech Support vs Lexington — 7-8 L
 */

const API_URL = process.env.API_URL || 'https://scorebot-api.siener.workers.dev';

function edt(time: string): number {
  const match = time.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) throw new Error(`Invalid time: ${time}`);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const period = match[4].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return new Date(Date.UTC(2026, 2, 22, hours + 4, minutes, seconds)).getTime();
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

async function main() {
  console.log(`Using API: ${API_URL}`);

  const createRes = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: 'yula-lexington-2026-03-22',
      ourTeamName: 'Tech Support',
      opponentName: 'Lexington',
      tournamentName: 'YULA',
      gameDate: '2026-03-22',
      gameOrder: 2,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  const events: Event[] = [
    { type: 'game_start', startingOnOffense: true, timestamp: edt('11:55:55 AM') },

    // Point 1: 1-0 Tech (Ellis to Gus)
    { type: 'goal', team: 'us', message: 'Ellis to Gus', timestamp: edt('11:56:37 AM') },

    // Point 2: 1-1 Lex
    { type: 'goal', team: 'them', message: '1-1', timestamp: edt('11:59:00 AM') },

    // Point 3: 1-2 Lex
    { type: 'goal', team: 'them', message: '1-2', timestamp: edt('12:02:27 PM') },

    // Timeout Lex
    { type: 'timeout', team: 'them', message: 'Timeout Lex', timestamp: edt('12:05:55 PM') },

    // Point 4: 1-3 Lex
    { type: 'goal', team: 'them', message: '1-3', timestamp: edt('12:09:43 PM') },

    // Point 5: 2-3 Tech (Ellis to Gus)
    { type: 'goal', team: 'us', message: 'Ellis to Gus', timestamp: edt('12:12:27 PM') },

    // Point 6: 2-4 Lex
    { type: 'goal', team: 'them', message: '2-4', timestamp: edt('12:14:50 PM') },

    // Point 7: 3-4 Tech (Alex to Jed)
    { type: 'goal', team: 'us', message: 'Alex to Jed', timestamp: edt('12:19:18 PM') },

    // Point 8: 4-4 Tech (Jake steal → Toby to Jake — break)
    { type: 'note', message: 'Jake steal', timestamp: edt('12:21:54 PM') },
    { type: 'goal', team: 'us', message: 'Toby to Jake', defensivePlay: 'steal', timestamp: edt('12:22:21 PM') },

    // Point 9: 4-5 Lex
    { type: 'goal', team: 'them', message: '4-5', timestamp: edt('12:25:55 PM') },

    // Point 10: 5-5 Tech (Jake to Alex)
    { type: 'goal', team: 'us', message: 'Jake to Alex', timestamp: edt('12:31:01 PM') },

    // Jake block but Lex still scores
    { type: 'note', message: 'Jake block', timestamp: edt('12:33:38 PM') },

    // Point 11: 5-6 Lex
    { type: 'goal', team: 'them', message: '5-6', timestamp: edt('12:35:54 PM') },

    // Tech goal called back — travel on Alex to Corbin
    { type: 'note', message: 'Goal called back, travel on Alex to Corbin', timestamp: edt('12:45:40 PM') },

    // Timeout Lex
    { type: 'timeout', team: 'them', message: 'Timeout Lex', timestamp: edt('12:47:04 PM') },

    // Point 12: 5-7 Lex
    { type: 'goal', team: 'them', message: '5-7', timestamp: edt('12:50:42 PM') },

    // HALFTIME 5-7
    { type: 'halftime', timestamp: edt('12:50:46 PM') },

    // SECOND HALF
    { type: 'second_half_start', timestamp: edt('12:57:00 PM') },

    // Point 13: 6-7 Tech (Mason block → Ellis to Jed)
    { type: 'note', message: 'Mason block', timestamp: edt('12:58:40 PM') },
    { type: 'goal', team: 'us', message: 'Ellis to Jed', defensivePlay: 'block', timestamp: edt('12:59:08 PM') },

    // Point 14: 7-7 Tech (Mason to Jake)
    { type: 'goal', team: 'us', message: 'Mason to Jake', timestamp: edt('1:06:15 PM') },

    // Timeout
    { type: 'timeout', message: 'Timeout', timestamp: edt('1:08:00 PM') },

    // Soft cap — playing to 9
    { type: 'note', message: 'Soft cap in effect, playing to 9', timestamp: edt('1:14:04 PM') },

    // Point 15: 7-8 Lex — game over (hard cap)
    { type: 'goal', team: 'them', message: '7-8', timestamp: edt('1:19:06 PM') },

    // GAME END
    { type: 'game_end', timestamp: edt('1:19:06 PM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`\nDone! Tech Support 7-8 Lexington`);
}

main().catch(console.error);
