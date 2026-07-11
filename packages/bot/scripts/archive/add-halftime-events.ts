/**
 * Script to add halftime events to games based on score milestones
 * - For 15-point games: halftime when first team reaches 8
 * - For 13-point games: halftime when first team reaches 7
 */

const API_URL = process.env.API_URL || 'http://localhost:8787';

interface Game {
  id: string;
  teams: {
    us: { name: string };
    them: { name: string };
  };
  score: {
    us: number;
    them: number };
  events: Array<{
    id: string;
    type: string;
    timestamp: number;
    score: { us: number; them: number };
    team?: string;
  }>;
}

async function findHalftimePoint(game: Game): Promise<number | null> {
  const finalScore = Math.max(game.score.us, game.score.them);
  let halftimeThreshold: number;

  // Determine halftime threshold
  if (finalScore === 15) {
    halftimeThreshold = 8;
  } else if (finalScore === 13) {
    halftimeThreshold = 7;
  } else {
    return null; // Not a 13 or 15 point game
  }

  // Check if halftime already exists
  const hasHalftime = game.events.some(e => e.type === 'halftime');
  if (hasHalftime) {
    console.log(`  ⏭️  Already has halftime event`);
    return null;
  }

  // Find the goal event where first team reached the threshold
  const goalEvents = game.events.filter(e => e.type === 'goal');

  for (let i = 0; i < goalEvents.length; i++) {
    const event = goalEvents[i];
    if (event.score.us === halftimeThreshold || event.score.them === halftimeThreshold) {
      return i; // Return index of the goal event
    }
  }

  return null;
}

async function addHalftimeEvent(gameId: string, goalEventIndex: number, game: Game): Promise<void> {
  const goalEvents = game.events.filter(e => e.type === 'goal');
  const halftimeGoal = goalEvents[goalEventIndex];
  const nextGoal = goalEvents[goalEventIndex + 1];

  // Calculate halftime timestamp to be between this goal and the next
  let halftimeTimestamp: number;
  if (nextGoal) {
    // Place halftime halfway between this goal and the next
    halftimeTimestamp = halftimeGoal.timestamp + Math.floor((nextGoal.timestamp - halftimeGoal.timestamp) / 2);
  } else {
    // No next goal, just add 1 second
    halftimeTimestamp = halftimeGoal.timestamp + 1000;
  }

  try {
    const response = await fetch(`${API_URL}/games/${gameId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'halftime',
        timestamp: halftimeTimestamp,
        score: { us: halftimeGoal.score.us, them: halftimeGoal.score.them },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add halftime: ${response.statusText}`);
    }

    console.log(`  ✅ Added halftime at ${halftimeGoal.score.us}-${halftimeGoal.score.them}`);
  } catch (error) {
    console.error(`  ❌ Error:`, error);
  }
}

async function main() {
  console.log('📊 Fetching games...\n');

  try {
    const response = await fetch(`${API_URL}/games`);
    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.statusText}`);
    }

    const { games } = await response.json() as { games: Game[] };
    console.log(`Found ${games.length} games\n`);

    let processedCount = 0;

    for (const gameSummary of games) {
      // Fetch full game data
      const gameResponse = await fetch(`${API_URL}/games/${gameSummary.id}`);
      if (!gameResponse.ok) {
        console.log(`⚠️  Failed to fetch game ${gameSummary.id}`);
        continue;
      }

      const { game } = await gameResponse.json() as { game: Game };
      const gameName = `${game.teams.us.name} vs ${game.teams.them.name} (${game.score.us}-${game.score.them})`;

      console.log(`Processing: ${gameName}`);

      const halftimeIndex = await findHalftimePoint(game);

      if (halftimeIndex !== null) {
        await addHalftimeEvent(game.id, halftimeIndex, game);
        processedCount++;
      }
    }

    console.log(`\n✅ Done! Added halftime events to ${processedCount} games.`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
