/**
 * Script to load November 1st game data into production
 * Based on _chat.txt game reporting
 */

const API_URL = 'https://scorebot-api.siener.workers.dev';

interface GameData {
  ourTeamName: string;
  opponentName: string;
  chatId: string;
  events: Array<{
    type: string;
    team?: string;
    message: string;
  }>;
}

const games: GameData[] = [
  // Game 1: Tech vs Bethesda Chevy-Chase - Final: 13-1
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
  // Game 2: Tech vs Lower Merion - Final: 13-11
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
  // Game 3: Tech vs Strathaven - Final: 13-7
  {
    ourTeamName: 'Tech Support',
    opponentName: 'Strathaven',
    chatId: 'nov1-game3-strath',
    events: [
      { type: 'game_start', message: 'Tech starting on D in their lights' },
      { type: 'goal', team: 'us', message: '1-0 Ellis to Jake - early break' },
      { type: 'goal', team: 'us', message: '2-0 Mason to Jake' },
      { type: 'goal', team: 'us', message: '3-0 Mason to Anatole' },
      { type: 'goal', team: 'us', message: '4-0 Alex to Nico' },
      { type: 'goal', team: 'them', message: '4-1' },
      { type: 'goal', team: 'us', message: '5-1 Jake steal then Jake to Mason' },
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
];

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

  // Start game
  const startResponse = await fetch(`${API_URL}/games/${createdGame.id}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'game_start', message: 'Game started' }),
  });

  if (!startResponse.ok) {
    throw new Error(`Failed to start game: ${await startResponse.text()}`);
  }

  // Add events
  for (const event of game.events) {
    if (event.type === 'game_start') continue; // Already started

    const eventResponse = await fetch(`${API_URL}/games/${createdGame.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!eventResponse.ok) {
      console.error(`Failed to add event: ${event.message}`);
      continue;
    }

    console.log(`  ✓ ${event.message}`);
  }

  console.log(`🎉 Game loaded successfully!`);
  return createdGame;
}

async function main() {
  console.log('🚀 Loading November 1st games into production...\n');
  console.log(`API URL: ${API_URL}\n`);

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
