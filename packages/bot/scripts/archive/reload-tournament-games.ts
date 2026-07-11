/**
 * Script to reload November 1-2 tournament games with enhanced parsing
 * Includes blocks, steals, timeouts, and starting O/D information
 */

const API_URL = 'https://scorebot-api.siener.workers.dev';

interface GameData {
  ourTeamName: string;
  opponentName: string;
  chatId: string;
  startingOnOffense?: boolean;
  events: Array<{
    type: string;
    team?: string;
    message: string;
    defensivePlay?: 'block' | 'steal';
  }>;
}

const games: GameData[] = [
  // November 1st - Game 1: Tech vs Bethesda Chevy-Chase - Final: 13-1
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Bethesda Chevy-Chase',
    chatId: 'nov1-game1-bcc',
    events: [
      { type: 'game_start', message: 'Tech starting on O in their darks' },
      { type: 'goal', team: 'us', message: '1-0 Jake to Nico' },
      { type: 'goal', team: 'us', message: '2-0 Cyrus to Anatole' },
      { type: 'goal', team: 'us', message: '3-0 Jake to Ellis' },
      { type: 'goal', team: 'us', message: '4-0 Mason to Alex tipped to Cyrus' },
      { type: 'goal', team: 'us', message: '5-0 Nico to Dock' },
      { type: 'goal', team: 'us', message: '6-0 Alex to Ben' },
      { type: 'goal', team: 'us', message: '7-0 Jake to Ellis' },
      { type: 'goal', team: 'us', message: '8-0 Alex to Cyrus' },
      { type: 'goal', team: 'us', message: '9-0 Nico to Jake' },
      { type: 'goal', team: 'us', message: '10-0 Nico to Ellis' },
      { type: 'goal', team: 'us', message: '11-0 Mason to Anatole' },
      { type: 'goal', team: 'them', message: '11-1' },
      { type: 'goal', team: 'us', message: '12-1 Mason to Cyrus' },
      { type: 'goal', team: 'us', message: '13-1 Jake to Corbin ftw' },
      { type: 'game_end', message: 'Final: 13-1' },
    ],
  },

  // November 1st - Game 2: Tech vs Lower Merion - Final: 13-11
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Lower Merion',
    chatId: 'nov1-game2-lm',
    events: [
      { type: 'game_start', message: 'Tech starting on O in their darks' },
      { type: 'goal', team: 'them', message: '0-1' },
      { type: 'goal', team: 'us', message: '1-1 Nico to diving Cyrus' },
      { type: 'goal', team: 'us', message: '2-1 Mason to Jake' },
      { type: 'goal', team: 'them', message: '2-2' },
      { type: 'goal', team: 'us', message: '3-2 Ellis to Jake' },
      { type: 'goal', team: 'us', message: '4-2 Jake to Mason' },
      { type: 'goal', team: 'us', message: '5-2 Jake to Mason redux' },
      { type: 'goal', team: 'them', message: '5-3' },
      { type: 'goal', team: 'us', message: '6-3 Ellis to Mason' },
      { type: 'goal', team: 'us', message: '7-3 Jake to Cyrus diving again' },
      { type: 'halftime', message: 'Half' },
      { type: 'goal', team: 'them', message: '7-4' },
      { type: 'goal', team: 'us', message: '8-4 Nico to Corbin' },
      { type: 'goal', team: 'them', message: '8-5' },
      { type: 'goal', team: 'them', message: '8-6' },
      { type: 'goal', team: 'us', message: '9-6 Mason to Corbin' },
      { type: 'goal', team: 'them', message: '9-7' },
      { type: 'goal', team: 'us', message: '10-7 Ellis to diving Jake' },
      { type: 'goal', team: 'them', message: '10-8' },
      { type: 'goal', team: 'them', message: '10-9' },
      { type: 'goal', team: 'us', message: '11-9 Mason to Jake' },
      { type: 'goal', team: 'them', message: '11-10' },
      { type: 'goal', team: 'us', message: '12-10 Ellis to Alex' },
      { type: 'goal', team: 'them', message: '12-11' },
      { type: 'goal', team: 'us', message: '13-11 Ellis to Anatole ftw' },
      { type: 'game_end', message: 'Final: 13-11' },
    ],
  },

  // November 1st - Game 3: Tech vs Strathaven - Final: 13-7
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Strathaven',
    chatId: 'nov1-game3-strath',
    startingOnOffense: false,
    events: [
      { type: 'game_start', message: 'Tech starting on D in their lights' },
      { type: 'goal', team: 'us', message: '1-0 Ellis to Jake - early break' },
      { type: 'goal', team: 'us', message: '2-0 Mason to Jake' },
      { type: 'goal', team: 'us', message: '3-0 Mason to Anatole' },
      { type: 'goal', team: 'us', message: '4-0 Alex to Nico' },
      { type: 'goal', team: 'them', message: '4-1' },
      { type: 'goal', team: 'us', message: '5-1 Jake steal then Jake to Mason', defensivePlay: 'steal' },
      { type: 'goal', team: 'them', message: '5-2' },
      { type: 'goal', team: 'us', message: '6-2 Mason to Alex' },
      { type: 'goal', team: 'us', message: '7-2 Alex to Asher' },
      { type: 'halftime', message: 'Half' },
      { type: 'goal', team: 'us', message: '8-2 Ellis to Alex' },
      { type: 'goal', team: 'them', message: '8-3' },
      { type: 'goal', team: 'us', message: '9-3 Ellis to Nico' },
      { type: 'goal', team: 'them', message: '9-4' },
      { type: 'goal', team: 'us', message: '10-4 Ellis to diving Alex' },
      { type: 'goal', team: 'them', message: '10-5' },
      { type: 'goal', team: 'us', message: '11-5 Jake hammer to Dock' },
      { type: 'goal', team: 'them', message: '11-6' },
      { type: 'goal', team: 'us', message: '12-6 Jake to Dock redux' },
      { type: 'goal', team: 'them', message: '12-7' },
      { type: 'goal', team: 'us', message: '13-7 Jake to Mason ftw' },
      { type: 'game_end', message: 'Final: 13-7' },
    ],
  },

  // November 2nd - Game 1: Tech vs Jackson-Reed - Final: 13-8
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Jackson-Reed',
    chatId: 'nov2-game1-jr',
    startingOnOffense: true,
    events: [
      { type: 'game_start', message: 'Tech starting on O in their lights' },
      { type: 'goal', team: 'them', message: '0-1' },
      { type: 'goal', team: 'us', message: '1-1 Cyrus steal Mason to Jed', defensivePlay: 'steal' },
      { type: 'goal', team: 'them', message: '1-2' },
      { type: 'goal', team: 'us', message: '2-2 Ellis to Jake' },
      { type: 'goal', team: 'them', message: '2-3' },
      { type: 'timeout', team: 'us', message: 'Timeout Tech' },
      { type: 'goal', team: 'us', message: '3-3 Mason block Jake to Mason', defensivePlay: 'block' },
      { type: 'goal', team: 'them', message: '3-4' },
      { type: 'timeout', team: 'them', message: 'Timeout JR' },
      { type: 'goal', team: 'them', message: '3-5' },
      { type: 'goal', team: 'us', message: '4-5 Mason hammer to Jed' },
      { type: 'goal', team: 'us', message: '5-5 Ellis block Ellis to Anatole', defensivePlay: 'block' },
      { type: 'goal', team: 'us', message: '6-5 Jake block in their end zone Mason hammer to Cyrus in back corner', defensivePlay: 'block' },
      { type: 'timeout', team: 'them', message: 'Timeout JR (I think)' },
      { type: 'goal', team: 'them', message: '6-6' },
      { type: 'goal', team: 'us', message: '7-6 Jake to Mason' },
      { type: 'halftime', message: 'Half' },
      { type: 'goal', team: 'them', message: '7-7' },
      { type: 'goal', team: 'us', message: '8-7 Cyrus to Ellis' },
      { type: 'goal', team: 'them', message: '8-8' },
      { type: 'goal', team: 'us', message: '9-8 Alex to Ellis' },
      { type: 'goal', team: 'us', message: '10-8 Toby block Jake to Anatole After deep huck Mason to Jake', defensivePlay: 'block' },
      { type: 'goal', team: 'us', message: '11-8 Cyrus steal Ellis to Toby', defensivePlay: 'steal' },
      { type: 'goal', team: 'us', message: '12-8 Ellis to Anatole' },
      { type: 'timeout', team: 'them', message: 'Timeout JR' },
      { type: 'goal', team: 'us', message: '13-8 Mason block Jake to Mason ftw', defensivePlay: 'block' },
      { type: 'game_end', message: 'Final: 13-8' },
    ],
  },

  // November 2nd - Game 2: Tech vs Columbia - Final: 10-13 (loss)
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Columbia',
    chatId: 'nov2-game2-columbia',
    startingOnOffense: true,
    events: [
      { type: 'game_start', message: 'Tech starting on O in their lights' },
      { type: 'goal', team: 'us', message: '1-0 Jake to Ellis' },
      { type: 'goal', team: 'them', message: '1-1' },
      { type: 'goal', team: 'us', message: '2-1 Nico to Dock' },
      { type: 'goal', team: 'them', message: '2-2' },
      { type: 'goal', team: 'us', message: '3-2 Ellis to Alex' },
      { type: 'goal', team: 'them', message: '3-3' },
      { type: 'goal', team: 'them', message: '3-4' },
      { type: 'goal', team: 'us', message: '4-4 Mason to Nico' },
      { type: 'timeout', team: 'us', message: 'Timeout Tech' },
      { type: 'goal', team: 'them', message: '4-5' },
      { type: 'goal', team: 'us', message: '5-5 Toby block Ellis to Alex', defensivePlay: 'block' },
      { type: 'goal', team: 'them', message: '5-6' },
      { type: 'timeout', team: 'them', message: 'Timeout Columbia' },
      { type: 'goal', team: 'us', message: '6-6 Mason to Jake' },
      { type: 'goal', team: 'them', message: '6-7' },
      { type: 'halftime', message: 'Half' },
      { type: 'goal', team: 'them', message: '6-8' },
      { type: 'goal', team: 'them', message: '6-9' },
      { type: 'goal', team: 'us', message: '7-9 Jake steal Ellis block Ellis to Alex', defensivePlay: 'steal' },
      { type: 'timeout', team: 'us', message: 'Timeout Tech' },
      { type: 'goal', team: 'us', message: '8-9 Ellis to Mason on the line' },
      { type: 'goal', team: 'them', message: '8-10' },
      { type: 'goal', team: 'us', message: '9-10 Ellis to Jake' },
      { type: 'goal', team: 'them', message: '9-11' },
      { type: 'goal', team: 'them', message: '9-12' },
      { type: 'timeout', team: 'them', message: 'Timeout Columbia' },
      { type: 'goal', team: 'us', message: '10-12 Mason to Jake Sky' },
      { type: 'goal', team: 'them', message: '10-13' },
      { type: 'game_end', message: 'Final: 10-13' },
    ],
  },
];

async function deleteAllGames() {
  console.log('🗑️  Fetching existing games...\n');

  const response = await fetch(`${API_URL}/games`);
  const { games } = await response.json();

  console.log(`Found ${games.length} games\n`);

  for (const game of games) {
    console.log(`Note: Game ${game.id} (${game.teams.us.name} vs ${game.teams.them.name}) - cannot delete via API`);
  }

  console.log('\n⚠️  Manual cleanup required:');
  console.log('Run: npx wrangler d1 execute scorebot --remote --command "DELETE FROM events; DELETE FROM games;"');
  console.log('\nPress Enter after running the command to continue...');

  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
}

async function createGame(game: GameData) {
  console.log(`\n📊 Creating game: ${game.ourTeamName} vs ${game.opponentName}`);

  // Create game
  const createResponse = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: game.chatId,
      ourTeamName: game.ourTeamName,
      opponentName: game.opponentName,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create game: ${await createResponse.text()}`);
  }

  const { game: createdGame } = await createResponse.json();
  console.log(`✅ Game created: ${createdGame.id}`);

  // Add events with enhanced data
  for (const event of game.events) {
    const eventPayload: any = {
      type: event.type,
      message: event.message,
    };

    if (event.team) {
      eventPayload.team = event.team;
    }

    if (event.defensivePlay) {
      eventPayload.defensivePlay = event.defensivePlay;
    }

    // Add starting offense info to game start event
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
  console.log('🚀 Reloading November 1-2 tournament games...\n');
  console.log(`API URL: ${API_URL}\n`);

  // Delete existing games
  await deleteAllGames();

  console.log('\n📥 Loading games with enhanced parsing...\n');

  for (const game of games) {
    try {
      await createGame(game);
    } catch (error) {
      console.error(`❌ Error loading game:`, error);
    }
  }

  console.log('\n✅ All games loaded!');
  console.log(`\nView at: https://score.kcuda.org`);
  console.log('\nEnhanced features included:');
  console.log('  - Starting offense/defense detection');
  console.log('  - Defensive plays (blocks & steals)');
  console.log('  - Timeout tracking');
}

main().catch(console.error);
