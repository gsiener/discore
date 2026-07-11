/**
 * Load 2026 NYC HSL Semifinal (5/14): Tech Support vs Hunter — W 15-6.
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
  return new Date(Date.UTC(2026, 4, 14, hours + 4, minutes, seconds)).getTime();
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
      chatId: 'hsl-semi-hunter-2026-05-14',
      ourTeamName: 'Tech Support',
      opponentName: 'Hunter',
      tournamentName: 'High School League',
      gameDate: '2026-05-14',
      gameOrder: 1,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  const events: Event[] = [
    { type: 'game_start', startingOnOffense: true, timestamp: edt('5:53:09 PM') },

    // 1-0 Tech: Marley to Corbin
    { type: 'goal', team: 'us', message: 'Marley to Corbin', timestamp: edt('5:54:12 PM') },

    // 1-1 Hunter
    { type: 'goal', team: 'them', message: '1-1', timestamp: edt('5:56:18 PM') },

    // 2-1 Tech: Marley block → Alex to Nate
    { type: 'note', message: 'Marley block', timestamp: edt('5:59:14 PM') },
    { type: 'goal', team: 'us', message: 'Alex to Nate', defensivePlay: 'block', timestamp: edt('5:59:43 PM') },

    // 3-1 Tech: Theo steal → Mason huck to Nico
    { type: 'note', message: 'Theo steal', timestamp: edt('6:02:27 PM') },
    { type: 'goal', team: 'us', message: 'Mason huck to Nico', defensivePlay: 'steal', timestamp: edt('6:02:33 PM') },

    // 4-1 Tech: Mason steal → Asher to Mason
    { type: 'note', message: 'Mason steal', timestamp: edt('6:04:26 PM') },
    { type: 'goal', team: 'us', message: 'Asher to Mason', defensivePlay: 'steal', timestamp: edt('6:04:50 PM') },

    // 5-1 Tech: Asher to Foster
    { type: 'goal', team: 'us', message: 'Asher to Foster', timestamp: edt('6:11:15 PM') },

    // 6-1 Tech: Ellis to Max on the deflection
    { type: 'goal', team: 'us', message: 'Ellis to Max on the deflection', timestamp: edt('6:14:17 PM') },

    // 6-2 Hunter
    { type: 'goal', team: 'them', message: '6-2', timestamp: edt('6:17:23 PM') },

    // 7-2 Tech: Cyrus to Nate
    { type: 'goal', team: 'us', message: 'Cyrus to Nate', timestamp: edt('6:20:34 PM') },

    // 8-2 Tech: Nico to Theo
    { type: 'goal', team: 'us', message: 'Nico to Theo', timestamp: edt('6:24:01 PM') },

    { type: 'halftime', timestamp: edt('6:24:14 PM') },
    { type: 'second_half_start', timestamp: edt('6:30:00 PM') },

    // 8-3 Hunter
    { type: 'goal', team: 'them', message: '8-3', timestamp: edt('6:31:20 PM') },

    // 9-3 Tech: Alex to Nate
    { type: 'goal', team: 'us', message: 'Alex to Nate', timestamp: edt('6:34:48 PM') },

    // 10-3 Tech: Ellis steal → Mason to Teyo
    { type: 'note', message: 'Ellis steal', timestamp: edt('6:37:18 PM') },
    { type: 'goal', team: 'us', message: 'Mason to Teyo', defensivePlay: 'steal', timestamp: edt('6:37:51 PM') },

    // 11-3 Tech: Foster to Ben
    { type: 'goal', team: 'us', message: 'Foster to Ben', timestamp: edt('6:41:00 PM') },

    // 11-4 Hunter (Alex block didn't convert)
    { type: 'note', message: 'Alex block', timestamp: edt('6:43:06 PM') },
    { type: 'goal', team: 'them', message: '11-4', timestamp: edt('6:43:19 PM') },

    // 11-5 Hunter (Marley block didn't convert)
    { type: 'note', message: 'Marley block', timestamp: edt('6:45:21 PM') },
    { type: 'goal', team: 'them', message: '11-5', timestamp: edt('6:47:49 PM') },

    // 12-5 Tech: Alex to Nate
    { type: 'goal', team: 'us', message: 'Alex to Nate', timestamp: edt('6:49:59 PM') },

    // 13-5 Tech: Nico steal → Mason huck to Toby
    { type: 'note', message: 'Nico steal', timestamp: edt('6:52:26 PM') },
    { type: 'goal', team: 'us', message: 'Mason huck to Toby', defensivePlay: 'steal', timestamp: edt('6:52:37 PM') },

    // 14-5 Tech: Mason deep to Teyo
    { type: 'goal', team: 'us', message: 'Mason deep to Teyo', timestamp: edt('6:55:34 PM') },

    // 14-6 Hunter
    { type: 'goal', team: 'them', message: '14-6', timestamp: edt('6:57:53 PM') },

    // 15-6 Tech: Cyrus to Nate — game
    { type: 'goal', team: 'us', message: 'Cyrus to Nate', timestamp: edt('7:00:29 PM') },
    { type: 'game_end', message: 'Tech win 15-6 — on to the City Championship!', timestamp: edt('7:00:36 PM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`\nDone! Tech Support 15-6 Hunter — on to the final.`);
}

main().catch(console.error);
