/**
 * Load YULA Day 1 Game 2: Tech Support vs Episcopal — 13-2 W
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
      chatId: 'yula-episcopal-2026-03-21',
      ourTeamName: 'Tech Support',
      opponentName: 'Episcopal',
      tournamentName: 'YULA',
      gameDate: '2026-03-21',
      gameOrder: 2,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  const events: Event[] = [
    { type: 'game_start', startingOnOffense: true, timestamp: edt('10:04:59 AM') },

    // Point 1: 1-0 Tech (Mason to Alex)
    { type: 'goal', team: 'us', message: 'Mason to Alex', timestamp: edt('10:08:19 AM') },

    // Point 2: 2-0 Tech (Asher to Teyo)
    { type: 'goal', team: 'us', message: 'Asher to Teyo', timestamp: edt('10:12:29 AM') },

    // Jed block — contested call
    { type: 'note', message: 'Jed block (contested)', timestamp: edt('10:14:42 AM') },

    // Point 3: 2-1 Episcopal
    { type: 'goal', team: 'them', message: '2-1', timestamp: edt('10:18:01 AM') },

    // Point 4: 3-1 Tech (Ellis hammer to Gus)
    { type: 'goal', team: 'us', message: 'Ellis hammer to Gus', timestamp: edt('10:22:28 AM') },

    // Point 5: 4-1 Tech (Foster to Teyo)
    { type: 'goal', team: 'us', message: 'Foster to Teyo', timestamp: edt('10:25:47 AM') },

    // Point 6: 5-1 Tech (Ben block → Nico to Ben)
    { type: 'note', message: 'Ben block', timestamp: edt('10:27:35 AM') },
    { type: 'goal', team: 'us', message: 'Nico to Ben', defensivePlay: 'block', timestamp: edt('10:29:39 AM') },

    // Point 7: 6-1 Tech (Gus block, Jed steal → Marley to Jed)
    { type: 'note', message: 'Gus block', timestamp: edt('10:32:12 AM') },
    { type: 'note', message: 'Jed steal', timestamp: edt('10:32:13 AM') },
    { type: 'goal', team: 'us', message: 'Marley to Jed', defensivePlay: 'steal', timestamp: edt('10:32:47 AM') },

    // Point 8: 7-1 Tech (Mason to Foster)
    { type: 'goal', team: 'us', message: 'Mason to Foster', timestamp: edt('10:35:05 AM') },

    // HALFTIME 7-1
    { type: 'halftime', timestamp: edt('10:35:14 AM') },

    // SECOND HALF
    { type: 'second_half_start', timestamp: edt('10:44:00 AM') },

    // Point 9: 7-2 Episcopal
    { type: 'goal', team: 'them', message: '7-2', timestamp: edt('10:45:01 AM') },

    // Point 10: 8-2 Tech (Cyrus to Ben)
    { type: 'goal', team: 'us', message: 'Cyrus to Ben', timestamp: edt('10:47:42 AM') },

    // Point 11: 9-2 Tech (Foster block, Toby block → Asher to Anatole)
    { type: 'note', message: 'Foster block', timestamp: edt('10:49:48 AM') },
    { type: 'note', message: 'Toby block', timestamp: edt('10:50:31 AM') },
    { type: 'goal', team: 'us', message: 'Asher to Anatole', defensivePlay: 'block', timestamp: edt('10:51:54 AM') },

    // Point 12: 10-2 Tech (Alex to Max)
    { type: 'goal', team: 'us', message: 'Alex to Max', timestamp: edt('10:54:42 AM') },

    // Point 13: 11-2 Tech (Mason hammer to Anatole)
    { type: 'goal', team: 'us', message: 'Mason hammer to Anatole', timestamp: edt('10:57:38 AM') },

    // Point 14: 12-2 Tech (Ben steal → Alex to Noah)
    { type: 'note', message: 'Ben steal', timestamp: edt('11:00:00 AM') },
    { type: 'goal', team: 'us', message: 'Alex to Noah', defensivePlay: 'steal', timestamp: edt('11:00:29 AM') },

    // Point 15: 13-2 Tech — GAME WINNER (Nico to Corbin)
    { type: 'goal', team: 'us', message: 'Nico to Corbin', timestamp: edt('11:03:18 AM') },

    // GAME END
    { type: 'game_end', timestamp: edt('11:03:18 AM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`\nDone! Tech Support 13-2 Episcopal`);
}

main().catch(console.error);
