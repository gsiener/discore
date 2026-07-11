/**
 * Script to delete all games from production
 */

const API_URL = 'https://scorebot-api.siener.workers.dev';

async function deleteAllGames() {
  console.log('🗑️  Deleting all games...\n');

  // Get all games
  const response = await fetch(`${API_URL}/games`);
  const { games } = await response.json();

  console.log(`Found ${games.length} games to delete\n`);

  for (const game of games) {
    try {
      // Note: We don't have a delete endpoint, so we'll just list them
      console.log(`Game: ${game.teams.us.name} vs ${game.teams.them.name} (${game.score.us}-${game.score.them})`);
      console.log(`  ID: ${game.id}`);
      console.log(`  Status: ${game.status}\n`);
    } catch (error) {
      console.error(`❌ Error listing game:`, error);
    }
  }

  console.log('\n⚠️  Note: No delete endpoint available. Games will remain in database.');
  console.log('To clean up, you can manually run SQL against the D1 database:');
  console.log('npx wrangler d1 execute scorebot --remote --command "DELETE FROM games; DELETE FROM events;"');
}

deleteAllGames().catch(console.error);
