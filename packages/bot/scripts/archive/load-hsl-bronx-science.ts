/**
 * Load High School League game: Tech Support vs Bronx Science (4/16/26)
 * Final: 13-3 W
 */

const API_URL = process.env.API_URL || 'https://api.score.kcuda.org';

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
  // EDT is UTC-4
  return new Date(Date.UTC(2026, 3, 16, hours + 4, minutes, seconds)).getTime();
}

type Event = {
  type: string;
  team?: string;
  message?: string;
  defensivePlay?: 'block' | 'steal';
  startingOnOffense?: boolean;
  timestamp: number;
  score?: { us: number; them: number };
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

  // Create game
  const createRes = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: 'hsl-bronx-science-2026-04-16',
      ourTeamName: 'Tech Support',
      opponentName: 'Bronx Science',
      tournamentName: 'High School League',
      gameDate: '2026-04-16',
      gameOrder: 1,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  const gameId = game.id;
  console.log(`Created game: ${gameId}`);

  const events: Event[] = [
    // === GAME START ===
    { type: 'game_start', startingOnOffense: true, timestamp: edt('5:29:14 PM') },

    // === Point 1: 1-0 Tech (Mason to Alex) ===
    { type: 'goal', team: 'us', message: 'Mason to Alex', timestamp: edt('5:35:42 PM') },

    // === Point 2: 2-0 Tech (Jake steal → Jed to Jake) ===
    { type: 'note', message: 'Jake steal', timestamp: edt('5:37:27 PM') },
    { type: 'goal', team: 'us', message: 'Jed to Jake', defensivePlay: 'steal', timestamp: edt('5:38:00 PM') },

    // === Point 3: 2-1 Bronx Science ===
    { type: 'goal', team: 'them', message: '2-1', timestamp: edt('5:39:56 PM') },

    // === Point 4: 3-1 Tech (Ellis to Max) ===
    { type: 'goal', team: 'us', message: 'Ellis to Max', timestamp: edt('5:42:54 PM') },

    // === Point 5: 4-1 Tech (Toby to Theo) ===
    { type: 'goal', team: 'us', message: 'Toby to Theo', timestamp: edt('5:45:04 PM') },

    // === Point 6: 5-1 Tech (Theo block, Jed block → Jake to Teyo) ===
    { type: 'note', message: 'Theo block', timestamp: edt('5:47:26 PM') },
    { type: 'note', message: 'Jed block', timestamp: edt('5:48:47 PM') },
    { type: 'goal', team: 'us', message: 'Jake to Teyo', defensivePlay: 'block', timestamp: edt('5:50:41 PM') },

    // === Timeout Bronx Science ===
    { type: 'timeout', team: 'them', message: 'Timeout Bronx Science', timestamp: edt('5:51:04 PM') },

    // === Point 7: 6-1 Tech (Nico steal → Mason to Jake) ===
    { type: 'note', message: 'Nico steal', timestamp: edt('5:57:53 PM') },
    { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'steal', timestamp: edt('5:58:30 PM') },

    // === Point 8: 6-2 Bronx Science ===
    { type: 'goal', team: 'them', message: '6-2', timestamp: edt('6:10:40 PM') },

    // === Point 9: 6-3 Bronx Science ===
    { type: 'goal', team: 'them', message: '6-3', timestamp: edt('6:12:30 PM') },

    // === Point 10: 7-3 Tech (Alex to Nate) ===
    { type: 'goal', team: 'us', message: 'Alex to Nate', timestamp: edt('6:14:59 PM') },

    // === HALFTIME at 7-3 ===
    { type: 'halftime', timestamp: edt('6:15:41 PM') },

    // === SECOND HALF START ===
    { type: 'second_half_start', timestamp: edt('6:22:00 PM') },

    // === Point 11: 8-3 Tech (Toby block → Mason huck to Nico) ===
    { type: 'note', message: 'Toby block', timestamp: edt('6:22:16 PM') },
    { type: 'goal', team: 'us', message: 'Mason huck to Nico', defensivePlay: 'block', timestamp: edt('6:22:50 PM') },

    // === Point 12: 9-3 Tech (Alex steal → Cyrus to Theo) ===
    { type: 'note', message: 'Alex steal', timestamp: edt('6:26:15 PM') },
    { type: 'goal', team: 'us', message: 'Cyrus to Theo', defensivePlay: 'steal', timestamp: edt('6:26:27 PM') },

    // === Point 13: 10-3 Tech (Nate diving block, Toby block → Nico to Jed) ===
    { type: 'note', message: 'Nate diving block', timestamp: edt('6:30:07 PM') },
    { type: 'note', message: 'Toby block', timestamp: edt('6:32:35 PM') },
    { type: 'goal', team: 'us', message: 'Nico to Jed', defensivePlay: 'block', timestamp: edt('6:33:53 PM') },

    // === Point 14: 11-3 Tech (Mason to Noah) ===
    { type: 'goal', team: 'us', message: 'Mason to Noah', timestamp: edt('6:36:22 PM') },

    // === Point 15: 12-3 Tech (Nico block → Nate to Teyo) ===
    { type: 'note', message: 'Nico block', timestamp: edt('6:43:08 PM') },
    { type: 'goal', team: 'us', message: 'Nate to Teyo', defensivePlay: 'block', timestamp: edt('6:45:14 PM') },

    // === Point 16: 13-3 Tech (Mason block → Jake to Toby ftw) ===
    { type: 'note', message: 'Mason block', timestamp: edt('6:48:01 PM') },
    { type: 'goal', team: 'us', message: 'Jake to Toby', defensivePlay: 'block', timestamp: edt('6:48:24 PM') },

    // === GAME END ===
    { type: 'game_end', timestamp: edt('6:48:30 PM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(gameId, event);
  }

  console.log(`\nDone! Game ${gameId} loaded with ${events.length} events.`);
  console.log(`Final score: Tech Support 13 - 3 Bronx Science`);
}

main().catch(console.error);
