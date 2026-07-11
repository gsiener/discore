/**
 * Load 2026 NYC HSL Championship final (5/30): Tech Support vs Bard — W 13-6.
 * Tech repeats as City Champs.
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
  return new Date(Date.UTC(2026, 4, 30, hours + 4, minutes, seconds)).getTime();
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
      chatId: 'hsl-final-bard-2026-05-30',
      ourTeamName: 'Tech Support',
      opponentName: 'Bard',
      tournamentName: 'NYC HSL Championship',
      gameDate: '2026-05-30',
      gameOrder: 1,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`Created game: ${game.id}`);

  const events: Event[] = [
    { type: 'game_start', startingOnOffense: false, timestamp: edt('3:34:27 PM') },

    // 1-0 Tech: Toby block (corrected later from Mason), Mason to Jake — BREAK
    { type: 'note', message: 'Toby block', timestamp: edt('3:37:35 PM') },
    { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'block', timestamp: edt('3:37:49 PM') },

    // 2-0 Tech: Mason to Jake
    { type: 'goal', team: 'us', message: 'Mason to Jake', timestamp: edt('3:40:29 PM') },

    // 3-0 Tech: Ellis steal → Mason to Jake — BREAK
    { type: 'note', message: 'Ellis steal', timestamp: edt('3:45:04 PM') },
    { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'steal', timestamp: edt('3:45:59 PM') },

    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('3:46:19 PM') },

    // 4-0 Tech: Nico to Foster
    { type: 'goal', team: 'us', message: 'Nico to Foster', timestamp: edt('3:50:46 PM') },

    // 4-1 Bard
    { type: 'goal', team: 'them', message: '4-1', timestamp: edt('3:53:00 PM') },

    // 5-1 Tech: Ellis block → Corbin block → Alex to Cyrus
    { type: 'note', message: 'Ellis block', timestamp: edt('3:55:09 PM') },
    { type: 'note', message: 'Corbin block', timestamp: edt('3:55:18 PM') },
    { type: 'goal', team: 'us', message: 'Alex to Cyrus', defensivePlay: 'block', timestamp: edt('3:56:24 PM') },

    // 5-2 Bard (Ben steal didn't convert)
    { type: 'note', message: 'Ben steal', timestamp: edt('4:01:12 PM') },
    { type: 'goal', team: 'them', message: '5-2', timestamp: edt('4:01:45 PM') },

    { type: 'timeout', team: 'them', message: 'Timeout Bard', timestamp: edt('4:03:17 PM') },

    // 6-2 Tech: long point — Anatole/Marley/Nate blocks, Cyrus steal, Ellis block → Alex to Ellis
    { type: 'note', message: 'Anatole block', timestamp: edt('4:08:25 PM') },
    { type: 'note', message: 'Marley block', timestamp: edt('4:09:25 PM') },
    { type: 'note', message: 'Nate block', timestamp: edt('4:09:33 PM') },
    { type: 'note', message: 'Nate steal', timestamp: edt('4:10:00 PM') },
    { type: 'timeout', team: 'them', message: 'Timeout Bard', timestamp: edt('4:10:42 PM') },
    { type: 'note', message: 'Cyrus steal', timestamp: edt('4:13:59 PM') },
    { type: 'note', message: 'Ellis block', timestamp: edt('4:17:11 PM') },
    { type: 'goal', team: 'us', message: 'Alex to Ellis', defensivePlay: 'block', timestamp: edt('4:17:15 PM') },

    // 7-2 Tech: Teyo block → Mason to Jake
    { type: 'note', message: 'Teyo block', timestamp: edt('4:19:32 PM') },
    { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'block', timestamp: edt('4:20:00 PM') },

    // 8-2 Tech: Nico to Jake — break for half
    { type: 'goal', team: 'us', message: 'Nico to Jake', timestamp: edt('4:22:17 PM') },
    { type: 'halftime', timestamp: edt('4:22:27 PM') },
    { type: 'second_half_start', timestamp: edt('4:30:00 PM') },

    // 9-2 Tech: Ellis to Nate
    { type: 'goal', team: 'us', message: 'Ellis to Nate', timestamp: edt('4:33:10 PM') },

    // 9-3 Bard (Asher/Nico/Mason blocks but they still scored)
    { type: 'note', message: 'Asher block', timestamp: edt('4:36:46 PM') },
    { type: 'note', message: 'Nico block', timestamp: edt('4:37:14 PM') },
    { type: 'note', message: 'Mason block', timestamp: edt('4:37:43 PM') },
    { type: 'goal', team: 'them', message: '9-3', timestamp: edt('4:39:04 PM') },

    { type: 'goal', team: 'them', message: '9-4', timestamp: edt('4:41:45 PM') },
    { type: 'goal', team: 'them', message: '9-5', timestamp: edt('4:47:33 PM') },

    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('4:48:56 PM') },

    // 10-5 Tech: Ellis to Jake
    { type: 'goal', team: 'us', message: 'Ellis to Jake', timestamp: edt('4:52:17 PM') },

    { type: 'goal', team: 'them', message: '10-6', timestamp: edt('4:55:03 PM') },

    // 11-6 Tech: Jake block → Ellis block → Ellis to Alex
    { type: 'note', message: 'Jake block', timestamp: edt('4:59:22 PM') },
    { type: 'note', message: 'Ellis block', timestamp: edt('5:01:06 PM') },
    { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'block', timestamp: edt('5:03:02 PM') },

    { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt('5:05:22 PM') },

    // 12-6 Tech: Jake to Teyo
    { type: 'goal', team: 'us', message: 'Jake to Teyo', timestamp: edt('5:08:40 PM') },

    // 13-6 Tech: Jake to diving Mason — REPEAT CITY CHAMPS
    { type: 'goal', team: 'us', message: 'Jake to diving Mason — REPEAT CITY CHAMPS', timestamp: edt('5:14:31 PM') },
    { type: 'game_end', message: 'Tech win 13-6 — NYC HSL Champions!', timestamp: edt('5:14:38 PM') },
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }

  console.log(`\n🏆 Tech Support 13-6 Bard — NYC HSL Champions (repeat)!`);
}

main().catch(console.error);
