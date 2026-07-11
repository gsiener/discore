/**
 * Load High School League game: Tech Support vs Bard (3/19/26)
 * Final: 11-5 W
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
  return new Date(Date.UTC(2026, 2, 19, hours + 4, minutes, seconds)).getTime();
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
      chatId: 'hsl-bard-2026-03-19',
      ourTeamName: 'Tech Support',
      opponentName: 'Bard',
      tournamentName: 'High School League',
      gameDate: '2026-03-19',
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
    { type: 'game_start', startingOnOffense: true, timestamp: edt('4:53:25 PM') },

    // === Point 1: 0-1 Bard (Tech started O, got broken) ===
    { type: 'note', message: 'Steal Nico', timestamp: edt('4:54:01 PM') },
    { type: 'note', message: 'Block Asher', timestamp: edt('4:54:39 PM') },
    { type: 'goal', team: 'them', message: '0-1', timestamp: edt('4:55:38 PM') },

    // === Point 2: 1-1 Tech (Ellis steal → Jake to Foster) ===
    { type: 'note', message: 'Ellis steal', timestamp: edt('4:58:58 PM') },
    { type: 'goal', team: 'us', message: 'Jake to Foster', defensivePlay: 'steal', timestamp: edt('4:59:33 PM') },

    // === Point 3: 2-1 Tech (Cyrus to Nico) ===
    { type: 'goal', team: 'us', message: 'Cyrus to Nico', timestamp: edt('5:03:07 PM') },

    // === Point 4: 3-1 Tech (lots of D, Asher to Alex) ===
    { type: 'note', message: 'Alex diving block', timestamp: edt('5:04:40 PM') },
    { type: 'note', message: 'Jake steal', timestamp: edt('5:06:10 PM') },
    { type: 'note', message: 'Alex block', timestamp: edt('5:07:28 PM') },
    { type: 'note', message: 'Gus block', timestamp: edt('5:07:29 PM') },
    { type: 'note', message: 'Foster block', timestamp: edt('5:09:28 PM') },
    { type: 'note', message: 'Noah block', timestamp: edt('5:10:20 PM') },
    { type: 'goal', team: 'us', message: 'Asher to Alex', defensivePlay: 'block', timestamp: edt('5:10:47 PM') },

    // === Timeout Bard ===
    { type: 'timeout', team: 'them', message: 'Timeout Bard', timestamp: edt('5:11:50 PM') },

    // === Point 5: 3-2 Bard ===
    { type: 'note', message: 'Noah block', timestamp: edt('5:13:27 PM') },
    { type: 'goal', team: 'them', message: '3-2', timestamp: edt('5:15:22 PM') },

    // === Point 6: 4-2 Tech (Asher to Gus) ===
    { type: 'goal', team: 'us', message: 'Asher to Gus', timestamp: edt('5:18:08 PM') },

    // === Point 7: 4-3 Bard ===
    { type: 'goal', team: 'them', message: '4-3', timestamp: edt('5:22:15 PM') },

    // === Timeout Bard ===
    { type: 'timeout', team: 'them', message: 'Timeout Bard', timestamp: edt('5:24:26 PM') },

    // === Point 8: 5-3 Tech (Ellis steal → Ellis to Asher) ===
    { type: 'note', message: 'Ellis steal', timestamp: edt('5:27:24 PM') },
    { type: 'goal', team: 'us', message: 'Ellis to Asher', defensivePlay: 'steal', timestamp: edt('5:27:28 PM') },

    // === Point 9: 6-3 Tech (Jake steal → Ellis to Noah) ===
    { type: 'note', message: 'Jake steal', timestamp: edt('5:31:33 PM') },
    { type: 'goal', team: 'us', message: 'Ellis to Noah', defensivePlay: 'steal', timestamp: edt('5:31:47 PM') },

    // === Point 10: 6-4 Bard ===
    { type: 'note', message: 'Ben block', timestamp: edt('5:34:10 PM') },
    { type: 'goal', team: 'them', message: '6-4', timestamp: edt('5:34:59 PM') },

    // === Point 11: 7-4 Tech (Jake huck to Gus) ===
    { type: 'goal', team: 'us', message: 'Jake huck to Gus', timestamp: edt('5:37:36 PM') },

    // === Point 12: 8-4 Tech (Jake blocks → Timeout Tech → Ellis to Alex) ===
    { type: 'note', message: 'Jake block', timestamp: edt('5:40:47 PM') },
    { type: 'note', message: 'Jake block', timestamp: edt('5:42:54 PM') },
    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('5:43:09 PM') },
    { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'block', timestamp: edt('5:46:30 PM') },

    // === HALFTIME ===
    { type: 'halftime', timestamp: edt('5:46:37 PM') },

    // === SECOND HALF START ===
    { type: 'second_half_start', timestamp: edt('5:54:00 PM') },

    // === Point 13: 9-4 Tech (tons of D → Cyrus to Max) ===
    { type: 'note', message: 'Cyrus steal', timestamp: edt('5:54:39 PM') },
    { type: 'note', message: 'Anatole steal', timestamp: edt('5:56:19 PM') },
    { type: 'note', message: 'Jake steal', timestamp: edt('5:56:33 PM') },
    { type: 'note', message: 'Anatole block', timestamp: edt('5:57:46 PM') },
    { type: 'note', message: 'Nico steal', timestamp: edt('5:58:53 PM') },
    { type: 'goal', team: 'us', message: 'Cyrus to Max', defensivePlay: 'steal', timestamp: edt('5:59:47 PM') },

    // === Point 14: 9-5 Bard ===
    { type: 'note', message: 'Asher diving block', timestamp: edt('6:02:19 PM') },
    { type: 'goal', team: 'them', message: '9-5', timestamp: edt('6:06:45 PM') },

    // === Point 15: 10-5 Tech (Jake steal → Alex to Nico) ===
    { type: 'note', message: 'Jake steal', timestamp: edt('6:09:35 PM') },
    { type: 'goal', team: 'us', message: 'Alex to Nico skying', defensivePlay: 'steal', timestamp: edt('6:11:08 PM') },

    // === Point 16: 11-5 Tech (Anatole steal, Teyo block → Asher to Foster) ===
    { type: 'note', message: 'Anatole steal', timestamp: edt('6:13:57 PM') },
    { type: 'note', message: 'Teyo block', timestamp: edt('6:14:13 PM') },
    { type: 'goal', team: 'us', message: 'Asher to Foster', defensivePlay: 'block', timestamp: edt('6:14:41 PM') },

    // === GAME END ===
    { type: 'game_end', timestamp: edt('6:15:16 PM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(gameId, event);
  }

  console.log(`\nDone! Game ${gameId} loaded with ${events.length} events.`);
  console.log(`Final score: Tech Support 11 - 5 Bard`);
}

main().catch(console.error);
