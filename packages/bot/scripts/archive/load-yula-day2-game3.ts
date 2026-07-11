/**
 * Load YULA Day 2 Game 3: Tech Support vs Haverford HUDA — 9-7 W (hard cap)
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
      chatId: 'yula-haverford-huda-2026-03-22',
      ourTeamName: 'Tech Support',
      opponentName: 'Haverford HUDA',
      tournamentName: 'YULA',
      gameDate: '2026-03-22',
      gameOrder: 3,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  const events: Event[] = [
    { type: 'game_start', startingOnOffense: true, timestamp: edt('1:51:55 PM') },

    // Point 1: 1-0 Tech (Mason to Gus)
    { type: 'goal', team: 'us', message: 'Mason to Gus', timestamp: edt('1:54:13 PM') },

    // Point 2: 1-1 HUDA
    { type: 'goal', team: 'them', message: '1-1', timestamp: edt('1:57:01 PM') },

    // Point 3: 1-2 HUDA
    { type: 'goal', team: 'them', message: '1-2', timestamp: edt('1:59:38 PM') },

    // Point 4: 2-2 Tech (Alex block → Ellis to Foster)
    { type: 'note', message: 'Alex block', timestamp: edt('2:01:56 PM') },
    { type: 'goal', team: 'us', message: 'Ellis to Foster', defensivePlay: 'block', timestamp: edt('2:05:11 PM') },

    // Point 5: 3-2 Tech (Toby to Max)
    { type: 'goal', team: 'us', message: 'Toby to Max', timestamp: edt('2:10:16 PM') },

    // Point 6: 3-3 HUDA
    { type: 'goal', team: 'them', message: '3-3', timestamp: edt('2:13:41 PM') },

    // Point 7: 3-4 HUDA (Anatole steal but HUDA still scored)
    { type: 'note', message: 'Anatole steal', timestamp: edt('2:17:07 PM') },
    { type: 'goal', team: 'them', message: '3-4', timestamp: edt('2:17:24 PM') },

    // Point 8: 4-4 Tech (Mason block, Nico steal → Mason huck to Gus)
    { type: 'note', message: 'Mason block', timestamp: edt('2:20:23 PM') },
    { type: 'note', message: 'Nico steal', timestamp: edt('2:21:30 PM') },
    { type: 'goal', team: 'us', message: 'Mason huck to Gus', defensivePlay: 'steal', timestamp: edt('2:22:02 PM') },

    // Point 9: 5-4 Tech (Toby steal → Jed to Anatole)
    { type: 'note', message: 'Toby steal', timestamp: edt('2:24:14 PM') },
    { type: 'goal', team: 'us', message: 'Jed to Anatole', defensivePlay: 'steal', timestamp: edt('2:26:02 PM') },

    // Point 10: 5-5 HUDA (Nico steals x2 but HUDA still scored)
    { type: 'note', message: 'Nico steal', timestamp: edt('2:29:29 PM') },
    { type: 'note', message: 'Nico steal', timestamp: edt('2:31:43 PM') },
    { type: 'goal', team: 'them', message: '5-5', timestamp: edt('2:32:40 PM') },

    // Timeout Tech
    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('2:33:39 PM') },

    // Point 11: 6-5 Tech (Alex to Cyrus)
    { type: 'goal', team: 'us', message: 'Alex to Cyrus', timestamp: edt('2:38:45 PM') },

    // Point 12: 7-5 Tech (Mason block → Toby to Teyo — break for half)
    { type: 'note', message: 'Mason block', timestamp: edt('2:41:54 PM') },
    { type: 'goal', team: 'us', message: 'Toby to Teyo', defensivePlay: 'block', timestamp: edt('2:42:10 PM') },

    // HALFTIME 7-5
    { type: 'halftime', timestamp: edt('2:44:05 PM') },

    // SECOND HALF
    { type: 'second_half_start', timestamp: edt('2:52:00 PM') },

    // Point 13: 7-6 HUDA
    { type: 'goal', team: 'them', message: '7-6', timestamp: edt('2:53:35 PM') },

    // Point 14: 8-6 Tech (Mason block → Mason to Ellis)
    { type: 'note', message: 'Mason block', timestamp: edt('2:57:22 PM') },
    { type: 'goal', team: 'us', message: 'Mason to Ellis', defensivePlay: 'block', timestamp: edt('2:59:05 PM') },

    // D plays — Jed block, Alex steal
    { type: 'note', message: 'Jed diving block', timestamp: edt('3:02:26 PM') },
    { type: 'note', message: 'Alex steal', timestamp: edt('3:03:16 PM') },

    // Soft cap
    { type: 'note', message: 'Soft cap in effect', timestamp: edt('3:07:20 PM') },

    // Timeout Tech
    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('3:08:33 PM') },

    // Point 15: 9-6 Tech (Alex to Jed — off the D plays above)
    { type: 'goal', team: 'us', message: 'Alex to Jed', defensivePlay: 'steal', timestamp: edt('3:13:00 PM') },

    // Point 16: 9-7 HUDA (hard cap)
    { type: 'goal', team: 'them', message: '9-7', timestamp: edt('3:21:42 PM') },

    // GAME END — hard cap
    { type: 'game_end', timestamp: edt('3:21:42 PM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`\nDone! Tech Support 9-7 Haverford HUDA (hard cap)`);
}

main().catch(console.error);
