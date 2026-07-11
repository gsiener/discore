/**
 * Load Tech Support games:
 *  - vs Hunter (4/27/26 HSL game) — Tech 11-4 W
 *  - Amherst Invite 2026 (5/2-5/3, UMass Amherst):
 *     1. vs Amherst BxJVA (5/2 AM)        — Tech 13-5 W
 *     2. vs Arlington (5/2 AM)            — Tech 11-9 W
 *     3. vs St. John's Prep (5/2 AM)      — Tech 13-2 W
 *     4. vs Northampton (5/2 PM)          — Tech 10-9 W (universe)
 *     5. vs St. John's Prep — semis (5/3) — Tech 13-2 W
 *     6. vs Four Rivers — final (5/3)     — Tech 9-10 L (hard cap)
 *
 * Run:  API_URL=https://api.score.kcuda.org npx tsx scripts/load-amherst-invite.ts
 */

const API_URL = process.env.API_URL || 'https://api.score.kcuda.org';

const EventType = {
  GAME_START: 'game_start',
  GOAL: 'goal',
  HALFTIME: 'halftime',
  SECOND_HALF_START: 'second_half_start',
  GAME_END: 'game_end',
  TIMEOUT: 'timeout',
  NOTE: 'note',
} as const;
type EventType = typeof EventType[keyof typeof EventType];

type EventInput = {
  type: EventType;
  team?: 'us' | 'them';
  message: string;
  playerName?: string;
  assistName?: string;
  defensivePlay?: 'block' | 'steal';
};

type GameSpec = {
  chatId: string;
  ourTeamName: string;
  opponentName: string;
  tournamentName: string;
  gameDate: string;
  gameOrder: number;
  startingOnOffense: boolean;
  events: EventInput[];
};

// Helpers to keep event lists readable.
const goalUs = (assist: string, scorer: string, score: string, dPlay?: 'block' | 'steal'): EventInput => ({
  type: EventType.GOAL,
  team: 'us',
  message: `${assist} to ${scorer} ${score}`,
  playerName: scorer,
  assistName: assist,
  ...(dPlay && { defensivePlay: dPlay }),
});
const goalThem = (opp: string, score: string): EventInput => ({
  type: EventType.GOAL,
  team: 'them',
  message: `${opp} scores ${score}`,
});
const block = (player: string): EventInput => ({
  type: EventType.NOTE,
  team: 'us',
  message: `${player} block`,
  playerName: player,
  defensivePlay: 'block',
});
const steal = (player: string): EventInput => ({
  type: EventType.NOTE,
  team: 'us',
  message: `${player} steal`,
  playerName: player,
  defensivePlay: 'steal',
});
const note = (msg: string): EventInput => ({ type: EventType.NOTE, message: msg });
const half = (): EventInput => ({ type: EventType.HALFTIME, message: 'Halftime' });
const timeoutThem = (opp: string): EventInput => ({ type: EventType.TIMEOUT, team: 'them', message: `Timeout ${opp}` });
const timeoutUs = (): EventInput => ({ type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' });

const games: GameSpec[] = [
  // ──────────────────────────────────────────────────────────────────
  // Game vs Hunter — 4/27/26, HSL
  // Broadcast by Irene (subbing in); some early-half attribution inferred.
  // ──────────────────────────────────────────────────────────────────
  {
    chatId: 'apr27-hunter-hsl',
    ourTeamName: 'Tech Support',
    opponentName: 'Hunter',
    tournamentName: 'High School League',
    gameDate: '2026-04-27',
    gameOrder: 1,
    startingOnOffense: true,
    events: [
      goalThem('Hunter', '0-1'),                                       // Tech turnover, Hunter scored
      goalUs('Asher', 'Theo', '1-1'),
      block('Max'),
      { type: EventType.GOAL, team: 'us', message: '2-1', defensivePlay: 'block' }, // no passer named
      block('Max'),
      goalUs('Ellis', 'Foster', '3-1', 'block'),
      goalThem('Hunter', '3-2'),
      goalUs('Asher', 'Gus', '4-2'),
      goalUs('Nico', 'Cyrus', '5-2'),
      goalUs('Mason', 'Jake', '6-2'),
      goalUs('Foster', 'Cyrus', '7-2'),
      half(),
      goalUs('Asher', 'Nico', '8-2'),
      block('Cyrus'),
      goalUs('Mason', 'Jake', '9-2', 'block'),
      goalThem('Hunter', '9-3'),
      goalUs('Mason', 'Gus', '10-3'),
      goalThem('Hunter', '10-4'),
      goalUs('Alex', 'Cyrus', '11-4'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // Game 1 vs Amherst BxJVA — 5/2/26 ~8:46 AM
  // ──────────────────────────────────────────────────────────────────
  {
    chatId: 'amherst-may2-game1-bxjva',
    ourTeamName: 'Tech Support',
    opponentName: 'Amherst BxJVA',
    tournamentName: 'Amherst Invite 2026',
    gameDate: '2026-05-02',
    gameOrder: 1,
    startingOnOffense: true,
    events: [
      block('Nate'),
      goalUs('Nico', 'Alex', '1-0', 'block'),
      goalUs('Mason', 'Foster', '2-0'),
      block('Teyo'),
      block('Anatole'),
      goalUs('Anatole', 'Teyo', '3-0', 'block'),
      block('Jake'),
      goalUs('Jake', 'Noah', '4-0', 'block'),
      timeoutThem('Amherst'),
      block('Nico'),
      steal('Mason'),
      goalUs('Nico', 'Nate', '5-0', 'steal'),
      block('Jake'),
      goalUs('Alex', 'Foster', '6-0', 'block'),
      block('Mason'),
      goalUs('Asher', 'Theo', '7-0', 'block'),
      half(),
      goalUs('Asher', 'Anatole', '8-0'),
      goalThem('Amherst', '8-1'),
      goalUs('Mason', 'Max', '9-1'),
      goalThem('Amherst', '9-2'),
      block('Dock'),
      goalUs('Mason', 'Jake', '10-2', 'block'),
      goalThem('Amherst', '10-3'),
      goalUs('Alex', 'Gus', '11-3'),
      block('Marley'),
      goalUs('Mason', 'Foster', '12-3', 'block'),
      goalThem('Amherst', '12-4'),
      block('Marley'),
      goalThem('Amherst', '12-5'),
      goalUs('Jed', 'Anatole', '13-5'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // Game 2 vs Arlington — 5/2/26 ~10:15 AM
  // ──────────────────────────────────────────────────────────────────
  {
    chatId: 'amherst-may2-game2-arlington',
    ourTeamName: 'Tech Support',
    opponentName: 'Arlington',
    tournamentName: 'Amherst Invite 2026',
    gameDate: '2026-05-02',
    gameOrder: 2,
    startingOnOffense: true,
    events: [
      goalThem('Arlington', '0-1'),
      steal('Gus'),
      goalUs('Marley', 'Gus', '1-1', 'steal'),
      goalThem('Arlington', '1-2'),
      goalThem('Arlington', '1-3'),
      timeoutUs(),
      note('Mason tip'),
      block('Corbin'),
      goalUs('Mason', 'Nate', '2-3', 'block'),
      block('Ellis'),
      note('Nico foot block'),
      goalUs('Mason', 'Nico', '3-3', 'block'),
      block('Noah'),
      timeoutThem('Arlington'),
      goalUs('Nico', 'Alex', '4-3'),
      block('Mason'),
      goalUs('Mason', 'Jake', '5-3', 'block'), // huck
      goalUs('Nico', 'Cyrus', '6-3'),          // deep
      goalThem('Arlington', '6-4'),
      half(),
      block('Ellis'),
      goalUs('Mason', 'Jake', '7-4', 'block'),
      block('Nate'),
      goalUs('Jed', 'Alex', '8-4', 'block'),
      goalThem('Arlington', '8-5'),
      goalUs('Ellis', 'Alex', '9-5'),
      goalThem('Arlington', '9-6'),
      goalThem('Arlington', '9-7'),
      timeoutUs(),
      goalThem('Arlington', '9-8'),
      goalUs('Ellis', 'Anatole', '10-8'),
      goalThem('Arlington', '10-9'),
      goalUs('Ellis', 'Nico', '11-9'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // Game 3 vs St. John's Prep — 5/2/26 ~11:45 AM (pool)
  // ──────────────────────────────────────────────────────────────────
  {
    chatId: 'amherst-may2-game3-sjp',
    ourTeamName: 'Tech Support',
    opponentName: "St. John's Prep",
    tournamentName: 'Amherst Invite 2026',
    gameDate: '2026-05-02',
    gameOrder: 3,
    startingOnOffense: true,
    events: [
      goalUs('Ellis', 'Nate', '1-0'),     // layout
      goalUs('Mason', 'Nico', '2-0'),
      timeoutThem("St. John's Prep"),
      block('Jake'),
      goalUs('Mason', 'Ben', '3-0', 'block'), // huck
      goalThem("St. John's Prep", '3-1'),
      goalUs('Alex', 'Marley', '4-1'),
      block('Jake'),
      goalUs('Mason', 'Foster', '5-1', 'block'),
      block('Noah'),
      goalUs('Nico', 'Noah', '6-1', 'block'),
      goalUs('Jake', 'Theo', '7-1'),
      half(),
      steal('Nico'),
      goalUs('Mason', 'Jake', '8-1', 'steal'),
      goalUs('Ellis', 'Anatole', '9-1'),
      block('Jake'),
      block('Nico'),
      steal('Jake'),
      goalUs('Mason', 'Jake', '10-1', 'steal'),
      goalUs('Alex', 'Nate', '11-1'),
      goalThem("St. John's Prep", '11-2'),
      goalUs('Ellis', 'Max', '12-2'),
      goalUs('Nico', 'Foster', '13-2'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // Game 4 vs Northampton — 5/2/26 ~4:09 PM (pool, universe)
  // ──────────────────────────────────────────────────────────────────
  {
    chatId: 'amherst-may2-game4-northampton',
    ourTeamName: 'Tech Support',
    opponentName: 'Northampton',
    tournamentName: 'Amherst Invite 2026',
    gameDate: '2026-05-02',
    gameOrder: 4,
    startingOnOffense: true,
    events: [
      steal('Ellis'),
      goalUs('Marley', 'Gus', '1-0', 'steal'),
      goalThem('Northampton', '1-1'),
      goalUs('Gus', 'Nate', '2-1'),
      goalThem('Northampton', '2-2'),
      goalUs('Ellis', 'Gus', '3-2'),       // deep
      goalUs('Ellis', 'Nico', '4-2'),
      goalUs('Mason', 'Teyo', '5-2'),
      timeoutThem('Northampton'),
      goalThem('Northampton', '5-3'),
      block('Alex'),
      goalUs('Ellis', 'Alex', '6-3', 'block'),
      block('Nico'),
      block('Ben'),
      goalThem('Northampton', '6-4'),
      half(),
      goalThem('Northampton', '6-5'),
      goalUs('Ellis', 'Alex', '7-5'),
      goalThem('Northampton', '7-6'),
      goalThem('Northampton', '7-7'),
      goalUs('Nate', 'Max', '8-7'),
      timeoutThem('Northampton'),
      block('Jake'),
      goalThem('Northampton', '8-8'),
      goalUs('Alex', 'Jake', '9-8'),
      goalThem('Northampton', '9-9'),
      goalUs('Ellis', 'Jake', '10-9'),     // ftw, universe
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // Game 5 vs St. John's Prep — 5/3/26 ~11:15 AM (semis)
  // ──────────────────────────────────────────────────────────────────
  {
    chatId: 'amherst-may3-semi-sjp',
    ourTeamName: 'Tech Support',
    opponentName: "St. John's Prep",
    tournamentName: 'Amherst Invite 2026',
    gameDate: '2026-05-03',
    gameOrder: 1,
    startingOnOffense: true,
    events: [
      goalUs('Ellis', 'Cyrus', '1-0'),
      goalUs('Toby', 'Mason', '2-0'),
      goalUs('Nico', 'Foster', '3-0'),
      block('Gus'),
      goalThem("St. John's Prep", '3-1'),
      goalUs('Ellis', 'Toby', '4-1'),
      goalThem("St. John's Prep", '4-2'),
      goalUs('Alex', 'Ellis', '5-2'),
      goalUs('Jed', 'Nico', '6-2'),
      timeoutUs(),
      block('Toby'),
      block('Toby'),
      goalUs('Ellis', 'Nico', '7-2', 'block'),
      half(),
      goalUs('Mason', 'Nico', '8-2'),
      goalUs('Toby', 'Nico', '9-2'),
      goalUs('Cyrus', 'Nate', '10-2'),
      goalUs('Cyrus', 'Corbin', '11-2'),
      block('Asher'),
      block('Teyo'),
      goalUs('Toby', 'Foster', '12-2', 'block'),
      block('Gus'),
      goalUs('Max', 'Gus', '13-2', 'block'), // ftw
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // Game 6 vs Four Rivers — 5/3/26 ~2:15 PM (final, hard cap loss)
  // ──────────────────────────────────────────────────────────────────
  {
    chatId: 'amherst-may3-final-fourrivers',
    ourTeamName: 'Tech Support',
    opponentName: 'Four Rivers',
    tournamentName: 'Amherst Invite 2026',
    gameDate: '2026-05-03',
    gameOrder: 2,
    startingOnOffense: false, // Tech started on D
    events: [
      goalUs('Ellis', 'Teyo', '1-0'),     // diving grab
      block('Toby'),
      goalThem('Four Rivers', '1-1'),
      goalThem('Four Rivers', '1-2'),
      goalUs('Mason', 'Nate', '2-2'),     // huck
      goalThem('Four Rivers', '2-3'),
      goalUs('Mason', 'Nate', '3-3'),
      goalThem('Four Rivers', '3-4'),
      block('Mason'),
      goalUs('Jed', 'Nate', '4-4', 'block'),
      goalThem('Four Rivers', '4-5'),
      goalThem('Four Rivers', '4-6'),
      block('Alex'),
      block('Corbin'),
      goalUs('Alex', 'Nate', '5-6', 'block'),
      block('Foster'),
      block('Gus'),
      goalUs('Mason', 'Jed', '6-6', 'block'),
      timeoutUs(),
      steal('Gus'),
      goalThem('Four Rivers', '6-7'),
      half(),
      goalThem('Four Rivers', '6-8'),
      goalUs('Ellis', 'Corbin', '7-8'),
      block('Mason'),
      goalThem('Four Rivers', '7-9'),
      goalThem('Four Rivers', '7-10'),
      goalUs('Nico', 'Max', '8-10'),
      block('Teyo'),
      goalUs('Ellis', 'Nico', '9-10'),    // confirmed by Patrick after the game
    ],
  },
];

async function createGame(spec: GameSpec): Promise<string> {
  console.log(`\n→ ${spec.opponentName} (${spec.gameDate}, order ${spec.gameOrder})`);
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: spec.chatId,
      ourTeamName: spec.ourTeamName,
      opponentName: spec.opponentName,
      tournamentName: spec.tournamentName,
      gameDate: spec.gameDate,
      gameOrder: spec.gameOrder,
    }),
  });
  if (!res.ok) throw new Error(`createGame failed: ${res.status} ${await res.text()}`);
  const { game } = (await res.json()) as { game: { id: string } };
  return game.id;
}

async function postEvent(gameId: string, body: object): Promise<void> {
  const res = await fetch(`${API_URL}/games/${gameId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`postEvent failed: ${res.status} ${await res.text()}`);
}

async function loadGame(spec: GameSpec): Promise<void> {
  const gameId = await createGame(spec);
  await postEvent(gameId, {
    type: EventType.GAME_START,
    message: `Game start - Tech starting on ${spec.startingOnOffense ? 'offense' : 'defense'}`,
    startingOnOffense: spec.startingOnOffense,
  });
  for (const ev of spec.events) await postEvent(gameId, ev);
  await postEvent(gameId, { type: EventType.GAME_END, message: 'Game complete' });
  console.log(`  ✓ ${spec.events.length} events → ${gameId}`);
}

async function main() {
  console.log(`API: ${API_URL}`);
  const filterChat = process.env.ONLY_CHAT_ID;
  const toLoad = filterChat ? games.filter((g) => g.chatId === filterChat) : games;
  console.log(`Loading ${toLoad.length} games...`);
  for (const spec of toLoad) await loadGame(spec);
  console.log('\n✅ Done. View at https://score.kcuda.org');
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
