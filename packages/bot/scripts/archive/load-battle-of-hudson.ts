/**
 * Script to load Battle of the Hudson tournament games (3/8/26)
 */

const API_URL = 'https://scorebot-api.siener.workers.dev';

// Helper to convert "3/8/26, HH:MM:SS AM/PM" to unix ms in Eastern time
function et(time: string): number {
  // Parse time like "8:59:04 AM" or "12:51:32 PM"
  const match = time.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) throw new Error(`Invalid time: ${time}`);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const ampm = match[4].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  // March 8, 2026 is DST spring-forward day, but clocks change at 2 AM
  // All game times are after 2 AM, so EDT (UTC-4) applies
  const date = new Date(Date.UTC(2026, 2, 8, hours + 4, minutes, seconds));
  return date.getTime();
}

interface GameData {
  ourTeamName: string;
  opponentName: string;
  chatId: string;
  startingOnOffense?: boolean;
  tournamentName?: string;
  gameDate?: string;
  gameOrder?: number;
  events: Array<{
    type: string;
    team?: string;
    message: string;
    defensivePlay?: 'block' | 'steal';
    timestamp?: number;
  }>;
}

const games: GameData[] = [
  // Game 1: Tech Support vs Montclair - Final: 13-4
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Montclair',
    chatId: 'mar8-game1-montclair',
    startingOnOffense: false,
    tournamentName: 'Battle of the Hudson',
    gameDate: '2026-03-08',
    gameOrder: 1,
    events: [
      { type: 'game_start', message: 'First pull', timestamp: et('8:59:04 AM') },
      { type: 'goal', team: 'them', message: '0-1 Montclair', timestamp: et('9:01:05 AM') },
      { type: 'goal', team: 'us', message: '1-1 Ellis to Jake', timestamp: et('9:05:21 AM') },
      { type: 'goal', team: 'them', message: '1-2', timestamp: et('9:08:55 AM') },
      { type: 'goal', team: 'us', message: '2-2 Ellis to Alex', timestamp: et('9:12:09 AM') },
      { type: 'goal', team: 'us', message: '3-2 Mason greatest to Nico', timestamp: et('9:16:11 AM') },
      { type: 'goal', team: 'them', message: '3-3', timestamp: et('9:20:43 AM') },
      { type: 'goal', team: 'us', message: '4-3 Corbin to Ellis', timestamp: et('9:24:02 AM') },
      { type: 'goal', team: 'us', message: '5-3 Nico to Jake', timestamp: et('9:27:35 AM') },
      { type: 'goal', team: 'us', message: '6-3 Mason to Jake', timestamp: et('9:31:58 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Montclair', timestamp: et('9:32:59 AM') },
      { type: 'goal', team: 'us', message: '7-3 Ellis to Corbin', defensivePlay: 'block', timestamp: et('9:39:51 AM') },
      { type: 'halftime', message: 'Half', timestamp: et('9:40:00 AM') },
      { type: 'goal', team: 'us', message: '8-3 Ellis blade to Alex', timestamp: et('9:49:08 AM') },
      { type: 'goal', team: 'us', message: '9-3 Mason to Jake', timestamp: et('9:51:40 AM') },
      { type: 'goal', team: 'them', message: '9-4', timestamp: et('9:54:14 AM') },
      { type: 'goal', team: 'us', message: '10-4 Nico deep to Cyrus', timestamp: et('9:57:13 AM') },
      { type: 'goal', team: 'us', message: '11-4 Mason hammer to Asher', timestamp: et('9:59:31 AM') },
      { type: 'goal', team: 'us', message: '12-4 Mason hammer to Asher', timestamp: et('10:01:46 AM') },
      { type: 'goal', team: 'us', message: '13-4 Cyrus to Jake', defensivePlay: 'block', timestamp: et('10:08:24 AM') },
      { type: 'game_end', message: 'Final: 13-4', timestamp: et('10:08:53 AM') },
    ],
  },

  // Game 2: Tech Support vs Columbia High School - Final: 13-12
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Columbia High School',
    chatId: 'mar8-game2-columbia',
    startingOnOffense: true,
    tournamentName: 'Battle of the Hudson',
    gameDate: '2026-03-08',
    gameOrder: 2,
    events: [
      { type: 'game_start', message: 'Tech starting on O in lights', timestamp: et('10:59:30 AM') },
      { type: 'goal', team: 'us', message: '1-0 Mason to Gus', timestamp: et('11:02:07 AM') },
      { type: 'goal', team: 'them', message: '1-1', timestamp: et('11:04:15 AM') },
      { type: 'goal', team: 'us', message: '2-1 Mason hammer to Corbin', timestamp: et('11:08:02 AM') },
      { type: 'goal', team: 'them', message: '2-2', timestamp: et('11:11:12 AM') },
      { type: 'note', message: 'Jake steal', timestamp: et('11:10:29 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: et('11:11:21 AM') },
      { type: 'goal', team: 'them', message: '2-3', timestamp: et('11:15:29 AM') },
      { type: 'goal', team: 'us', message: '3-3 Mason deep to Jake', timestamp: et('11:18:50 AM') },
      { type: 'note', message: 'Toby block', timestamp: et('11:21:56 AM') },
      { type: 'goal', team: 'them', message: '3-4', timestamp: et('11:23:41 AM') },
      { type: 'goal', team: 'them', message: '3-5', timestamp: et('11:26:32 AM') },
      { type: 'goal', team: 'us', message: '4-5 Mason to Alex', timestamp: et('11:30:46 AM') },
      { type: 'goal', team: 'us', message: '5-5 Mason to Toby', timestamp: et('11:33:47 AM') },
      { type: 'note', message: 'Toby block', timestamp: et('11:35:56 AM') },
      { type: 'goal', team: 'them', message: '5-6', timestamp: et('11:37:22 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: et('11:37:49 AM') },
      { type: 'goal', team: 'us', message: '6-6 Ellis to Mason', timestamp: et('11:43:28 AM') },
      { type: 'goal', team: 'them', message: '6-7', timestamp: et('11:47:09 AM') },
      { type: 'halftime', message: 'Half', timestamp: et('11:48:13 AM') },
      { type: 'goal', team: 'them', message: '6-8', timestamp: et('12:00:09 PM') },
      { type: 'goal', team: 'them', message: '6-9', timestamp: et('12:05:52 PM') },
      { type: 'goal', team: 'us', message: '7-9 Ellis to Jake', timestamp: et('12:09:48 PM') },
      { type: 'goal', team: 'them', message: '7-10', timestamp: et('12:12:04 PM') },
      { type: 'goal', team: 'us', message: '8-10 Alex to Jake', timestamp: et('12:14:54 PM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: et('12:20:50 PM') },
      { type: 'goal', team: 'us', message: '9-10 Mason deep to Jake', defensivePlay: 'block', timestamp: et('12:25:30 PM') },
      { type: 'goal', team: 'them', message: '9-11', timestamp: et('12:27:45 PM') },
      { type: 'goal', team: 'them', message: '9-12', timestamp: et('12:31:13 PM') },
      { type: 'goal', team: 'us', message: '10-12 Jake to Gus', timestamp: et('12:33:33 PM') },
      { type: 'goal', team: 'us', message: '11-12 Ellis to Alex', defensivePlay: 'steal', timestamp: et('12:35:56 PM') },
      { type: 'goal', team: 'us', message: '12-12 Ellis to Alex', timestamp: et('12:43:06 PM') },
      { type: 'goal', team: 'us', message: '13-12 Ellis to Alex', defensivePlay: 'block', timestamp: et('12:51:16 PM') },
      { type: 'game_end', message: 'Final: 13-12 Universe point', timestamp: et('12:51:32 PM') },
    ],
  },
];

async function deleteGame(gameId: string) {
  // Delete via D1 directly isn't possible from here, so we use the API
  const response = await fetch(`${API_URL}/games/${gameId}`, { method: 'DELETE' });
  if (response.ok) {
    console.log(`  Deleted game ${gameId}`);
  } else {
    console.log(`  Could not delete ${gameId}: ${response.status}`);
  }
}

async function createGame(game: GameData) {
  console.log(`\n📊 Creating game: ${game.ourTeamName} vs ${game.opponentName}`);

  const createResponse = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: game.chatId,
      ourTeamName: game.ourTeamName,
      opponentName: game.opponentName,
      tournamentName: game.tournamentName,
      gameDate: game.gameDate,
      gameOrder: game.gameOrder,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create game: ${await createResponse.text()}`);
  }

  const { game: createdGame } = await createResponse.json();
  console.log(`✅ Game created: ${createdGame.id}`);

  for (const event of game.events) {
    const eventPayload: any = {
      type: event.type,
      message: event.message,
    };

    if (event.team) eventPayload.team = event.team;
    if (event.defensivePlay) eventPayload.defensivePlay = event.defensivePlay;
    if (event.timestamp) eventPayload.timestamp = event.timestamp;

    if (event.type === 'game_start' && game.startingOnOffense !== undefined) {
      eventPayload.startingOnOffense = game.startingOnOffense;
    }

    const eventResponse = await fetch(`${API_URL}/games/${createdGame.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    });

    if (!eventResponse.ok) {
      console.error(`❌ Failed to add event: ${event.message}`);
      console.error(await eventResponse.text());
      continue;
    }

    const defensiveInfo = event.defensivePlay ? ` [${event.defensivePlay}]` : '';
    console.log(`  ✓ ${event.message}${defensiveInfo}`);
  }

  console.log(`🎉 Game loaded successfully!`);
  return createdGame;
}

async function main() {
  console.log('🚀 Loading Battle of the Hudson games (3/8/26)...\n');
  console.log(`API URL: ${API_URL}\n`);

  // First, find and delete existing Battle of the Hudson games
  console.log('🗑️  Checking for existing games to replace...');
  const listResponse = await fetch(`${API_URL}/games`);
  const { games: existingGames } = await listResponse.json();
  for (const g of existingGames) {
    if (g.gameDate === '2026-03-08') {
      await deleteGame(g.id);
    }
  }

  console.log('\n📥 Loading games with timestamps...\n');

  for (const game of games) {
    try {
      await createGame(game);
    } catch (error) {
      console.error(`❌ Error loading game:`, error);
    }
  }

  console.log('\n✅ All games loaded!');
  console.log(`\nView at: https://score.kcuda.org`);
}

main().catch(console.error);
