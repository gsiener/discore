/**
 * Script to update existing games with startingOnOffense field
 * Run with: node --loader ts-node/esm scripts/update-starting-possession.ts
 * Or for production: API_URL=https://scorebot-api.siener.workers.dev node scripts/update-starting-possession.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:8787';

interface Game {
  id: string;
  startingOnOffense?: boolean;
  teams: {
    us: { name: string };
    them: { name: string };
  };
  score: {
    us: number;
    them: number;
  };
}

async function updateGame(gameId: string, startingOnOffense: boolean): Promise<void> {
  try {
    // Update the game using PATCH endpoint
    const response = await fetch(`${API_URL}/games/${gameId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startingOnOffense }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update game ${gameId}: ${response.statusText}`);
    }

    const { game } = await response.json();
    console.log(`  ✅ Updated ${game.teams.us.name} vs ${game.teams.them.name}: startingOnOffense=${startingOnOffense}`);
  } catch (error) {
    console.error(`  ❌ Error updating game ${gameId}:`, error);
  }
}

async function main() {
  console.log(`📊 Fetching games from ${API_URL}...\n`);

  try {
    const response = await fetch(`${API_URL}/games`);
    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.statusText}`);
    }

    const { games } = await response.json() as { games: Game[] };
    console.log(`Found ${games.length} games\n`);

    // Filter games that don't have startingOnOffense set
    const gamesToUpdate = games.filter(g => g.startingOnOffense === undefined || g.startingOnOffense === null);
    console.log(`${gamesToUpdate.length} games need startingOnOffense field\n`);

    if (gamesToUpdate.length === 0) {
      console.log('✅ All games already have startingOnOffense set!');
      return;
    }

    console.log('Games missing startingOnOffense:');
    for (const game of gamesToUpdate) {
      console.log(`  - ${game.id}: ${game.teams.us.name} vs ${game.teams.them.name} (${game.score.us}-${game.score.them})`);
    }

    console.log('\n📝 Updating games with startingOnOffense=true (assuming Brooklyn Tech started on offense)...\n');

    // Update all games (assuming they started on offense, which is a common convention)
    for (const game of gamesToUpdate) {
      await updateGame(game.id, true);
    }

    console.log('\n✅ All games updated!');
    console.log('\n📊 Verifying updates...\n');

    // Verify updates
    const verifyResponse = await fetch(`${API_URL}/games`);
    const { games: updatedGames } = await verifyResponse.json() as { games: Game[] };
    const gamesWithStarting = updatedGames.filter(g => g.startingOnOffense !== undefined && g.startingOnOffense !== null);
    console.log(`${gamesWithStarting.length}/${updatedGames.length} games now have startingOnOffense set`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
