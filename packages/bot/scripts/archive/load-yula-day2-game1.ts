/**
 * Load YULA Day 2 Game 1: Tech Support vs Jackson Reed — 11-10 W (universe point)
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
      chatId: 'yula-jackson-reed-2026-03-22',
      ourTeamName: 'Tech Support',
      opponentName: 'Jackson Reed',
      tournamentName: 'YULA',
      gameDate: '2026-03-22',
      gameOrder: 1,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  const events: Event[] = [
    { type: 'game_start', startingOnOffense: true, timestamp: edt('10:04:09 AM') },

    // Point 1: 1-0 Tech (Jake to Nico)
    { type: 'goal', team: 'us', message: 'Jake to Nico', timestamp: edt('10:13:06 AM') },

    // Point 2: 2-0 Tech (Jake block → Mason to Jake)
    { type: 'note', message: 'Jake block', timestamp: edt('10:16:26 AM') },
    { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'block', timestamp: edt('10:16:37 AM') },

    // Point 3: 3-0 Tech (Alex block → Mason to Jake)
    { type: 'note', message: 'Alex block', timestamp: edt('10:19:04 AM') },
    { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'block', timestamp: edt('10:20:12 AM') },

    // Point 4: 3-1 Jackson Reed
    { type: 'goal', team: 'them', message: '3-1', timestamp: edt('10:23:47 AM') },

    // Point 5: 3-2 Jackson Reed
    { type: 'goal', team: 'them', message: '3-2', timestamp: edt('10:28:27 AM') },

    // Point 6: 3-3 Jackson Reed
    { type: 'goal', team: 'them', message: '3-3', timestamp: edt('10:31:36 AM') },

    // Timeout Tech
    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('10:32:35 AM') },

    // Point 7: 4-3 Tech (Mason hammer to Jake)
    { type: 'goal', team: 'us', message: 'Mason hammer to Jake', timestamp: edt('10:37:14 AM') },

    // Point 8: 4-4 Jackson Reed
    { type: 'goal', team: 'them', message: '4-4', timestamp: edt('10:39:45 AM') },

    // Point 9: 4-5 Jackson Reed
    { type: 'goal', team: 'them', message: '4-5', timestamp: edt('10:43:46 AM') },

    // Point 10: 5-5 Tech (Ellis to Nico)
    { type: 'goal', team: 'us', message: 'Ellis to Nico', timestamp: edt('10:47:26 AM') },

    // Point 11: 5-6 Jackson Reed
    { type: 'goal', team: 'them', message: '5-6', timestamp: edt('10:50:05 AM') },

    // Point 12: 6-6 Tech
    { type: 'goal', team: 'us', message: '6-6', timestamp: edt('10:54:22 AM') },

    // Mason steal but JR still scores
    { type: 'note', message: 'Mason steal', timestamp: edt('10:57:42 AM') },

    // Point 13: 6-7 Jackson Reed
    { type: 'goal', team: 'them', message: '6-7', timestamp: edt('10:58:39 AM') },

    // HALFTIME 6-7
    { type: 'halftime', timestamp: edt('10:58:41 AM') },

    // SECOND HALF
    { type: 'second_half_start', timestamp: edt('11:08:00 AM') },

    // Point 14: 7-7 Tech (Toby block → Mason to Ellis — break to start 2nd half)
    { type: 'note', message: 'Toby block', timestamp: edt('11:09:11 AM') },
    { type: 'goal', team: 'us', message: 'Mason to Ellis', defensivePlay: 'block', timestamp: edt('11:09:45 AM') },

    // Point 15: 7-8 Jackson Reed
    { type: 'goal', team: 'them', message: '7-8', timestamp: edt('11:13:52 AM') },

    // Point 16: 8-8 Tech (Nico to Mason)
    { type: 'goal', team: 'us', message: 'Nico to Mason', timestamp: edt('11:16:40 AM') },

    // Point 17: 8-9 Jackson Reed
    { type: 'goal', team: 'them', message: '8-9', timestamp: edt('11:19:49 AM') },

    // Timeout Tech
    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('11:21:09 AM') },

    // Point 18: 9-9 Tech (Mason hammer to Corbin)
    { type: 'goal', team: 'us', message: 'Mason hammer to Corbin', timestamp: edt('11:25:52 AM') },

    // Point 19: 10-9 Tech (Toby block, Gus steal → Jake to Gus)
    { type: 'note', message: 'Toby block', timestamp: edt('11:28:18 AM') },
    { type: 'note', message: 'Gus steal', timestamp: edt('11:29:39 AM') },
    { type: 'goal', team: 'us', message: 'Jake to Gus', defensivePlay: 'steal', timestamp: edt('11:29:53 AM') },

    // Point 20: 10-10 Jackson Reed
    { type: 'goal', team: 'them', message: '10-10', timestamp: edt('11:32:52 AM') },

    // Soft cap — universe point
    { type: 'note', message: 'Soft cap, universe point', timestamp: edt('11:33:01 AM') },

    // Timeout Tech
    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('11:33:10 AM') },

    // Point 21: 11-10 Tech — UNIVERSE POINT WINNER (Alex to Mason)
    { type: 'goal', team: 'us', message: 'Alex to Mason', timestamp: edt('11:37:19 AM') },

    // GAME END
    { type: 'game_end', timestamp: edt('11:37:19 AM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`\nDone! Tech Support 11-10 Jackson Reed (universe point)`);
}

main().catch(console.error);
