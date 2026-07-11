/**
 * Load YULA Day 1 Game 3: Tech Support vs Blair — 12-9 W
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

async function main() {
  console.log(`Using API: ${API_URL}`);

  const createRes = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: 'yula-blair-2026-03-21',
      ourTeamName: 'Tech Support',
      opponentName: 'Blair',
      tournamentName: 'YULA',
      gameDate: '2026-03-21',
      gameOrder: 3,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  const events: Event[] = [
    { type: 'game_start', startingOnOffense: true, timestamp: edt('11:31:32 AM') },

    // Point 1: 0-1 Blair (Tech on O, Gus block + Alex steal but Blair still scored)
    { type: 'note', message: 'Gus block', timestamp: edt('11:34:42 AM') },
    { type: 'note', message: 'Alex steal', timestamp: edt('11:35:39 AM') },
    { type: 'goal', team: 'them', message: '0-1', timestamp: edt('11:40:51 AM') },

    // Point 2: 1-1 Tech (Ellis block → Mason to Nico)
    { type: 'note', message: 'Ellis block', timestamp: edt('11:44:24 AM') },
    { type: 'goal', team: 'us', message: 'Mason to Nico', defensivePlay: 'block', timestamp: edt('11:44:55 AM') },

    // Point 3: 1-2 Blair
    { type: 'goal', team: 'them', message: '1-2', timestamp: edt('11:47:31 AM') },

    // Point 4: 2-2 Tech (Ellis to Alex)
    { type: 'goal', team: 'us', message: 'Ellis to Alex', timestamp: edt('11:51:10 AM') },

    // Point 5: 3-2 Tech (Mason block → Nico to Corbin)
    { type: 'note', message: 'Mason block', timestamp: edt('11:55:11 AM') },
    { type: 'goal', team: 'us', message: 'Nico to Corbin', defensivePlay: 'block', timestamp: edt('11:56:03 AM') },

    // Timeout Blair
    { type: 'timeout', team: 'them', message: 'Timeout Blair', timestamp: edt('11:57:14 AM') },

    // Point 6: 4-2 Tech (Nico block → Foster to Toby)
    { type: 'note', message: 'Nico block', timestamp: edt('12:00:09 PM') },
    { type: 'goal', team: 'us', message: 'Foster to Toby', defensivePlay: 'block', timestamp: edt('12:00:45 PM') },

    // Point 7: 4-3 Blair
    { type: 'goal', team: 'them', message: '4-3', timestamp: edt('12:02:54 PM') },

    // Point 8: 5-3 Tech (Ellis to Alex)
    { type: 'goal', team: 'us', message: 'Ellis to Alex', timestamp: edt('12:05:26 PM') },

    // Point 9: 6-3 Tech (Jake block → goal)
    { type: 'note', message: 'Jake block', timestamp: edt('12:07:10 PM') },
    { type: 'goal', team: 'us', message: '6-3', defensivePlay: 'block', timestamp: edt('12:07:22 PM') },

    // HALFTIME (no explicit halftime message — but with 6-3 at ~12:07 and 6-4 at 12:10, halftime likely here)
    // Actually there's no halftime message in this game. Let me check the score progression:
    // 6-3 then 6-4 then 7-4... no explicit halftime called. I'll skip halftime event.

    // Point 10: 6-4 Blair
    { type: 'goal', team: 'them', message: '6-4', timestamp: edt('12:10:12 PM') },

    // Point 11: 7-4 Tech (Ellis to Anatole)
    { type: 'goal', team: 'us', message: 'Ellis to Anatole', timestamp: edt('12:13:56 PM') },

    // HALFTIME at 7-4 (9-min gap suggests halftime here)
    { type: 'halftime', timestamp: edt('12:14:30 PM') },
    { type: 'second_half_start', timestamp: edt('12:22:00 PM') },

    // Point 12: 7-5 Blair
    { type: 'goal', team: 'them', message: '7-5', timestamp: edt('12:23:07 PM') },

    // Point 13: 8-5 Tech (Cyrus to Gus)
    { type: 'goal', team: 'us', message: 'Cyrus to Gus', timestamp: edt('12:26:03 PM') },

    // Point 14: 9-5 Tech (Toby to Foster)
    { type: 'goal', team: 'us', message: 'Toby to Foster', timestamp: edt('12:28:41 PM') },

    // Point 15: 9-6 Blair
    { type: 'goal', team: 'them', message: '9-6', timestamp: edt('12:31:39 PM') },

    // Point 16: 10-6 Tech (Ellis to Alex)
    { type: 'goal', team: 'us', message: 'Ellis to Alex', timestamp: edt('12:34:38 PM') },

    // Point 17: 10-7 Blair
    { type: 'goal', team: 'them', message: '10-7', timestamp: edt('12:37:15 PM') },

    // Point 18: 10-8 Blair
    { type: 'goal', team: 'them', message: '10-8', timestamp: edt('12:39:17 PM') },

    // Point 19: 11-8 Tech (Toby to Gus)
    { type: 'goal', team: 'us', message: 'Toby to Gus', timestamp: edt('12:41:59 PM') },

    // Note: soft cap
    { type: 'note', message: 'Soft cap in effect, playing to 12', timestamp: edt('12:42:11 PM') },

    // Point 20: 11-9 Blair
    { type: 'goal', team: 'them', message: '11-9', timestamp: edt('12:45:48 PM') },

    // Point 21: 12-9 Tech — GAME WINNER (Jake to Nico)
    { type: 'goal', team: 'us', message: 'Jake to Nico', timestamp: edt('12:48:23 PM') },

    // GAME END
    { type: 'game_end', timestamp: edt('12:48:23 PM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`\nDone! Tech Support 12-9 Blair`);
}

main().catch(console.error);
