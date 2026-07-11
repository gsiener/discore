/**
 * TEMPLATE for loading a new tournament via the loader harness.
 *
 * This is the data form that replaces the old one-off load/reload/fix scripts.
 * Copy this file, edit the `spec` below, and run it:
 *
 *   SCOREBOT_API_URL=https://api.score.kcuda.org npx tsx scripts/<your-file>.ts --run
 *
 * Notes:
 *  - A spec is PURE DATA. Event `time` is local wall-clock in `spec.timezone`;
 *    EST/EDT is derived from the date automatically (no offset math needed).
 *  - `startingOnOffense` at the game level is attached to the game_start event.
 *  - To fix/replace an already-loaded game, set `existingGameId` on that game;
 *    it is deleted and re-created from this data.
 *  - Without `--run` this file only prints instructions (safe to import/parse),
 *    so it never touches a live API by accident.
 *
 * The data below is the real YULA Day 1 game (Tech Support vs Montclair, 3/21/26),
 * converted verbatim from the legacy scripts/archive/load-yula-day1.ts.
 */

import { EventType } from '@scorebot/shared';
import { loadTournament, TournamentSpec } from './lib/loader.js';

const spec: TournamentSpec = {
  tournament: 'YULA',
  timezone: 'America/New_York',
  games: [
    {
      date: '2026-03-21',
      ourTeam: 'Tech Support',
      opponent: 'Montclair',
      chatId: 'yula-montclair-2026-03-21',
      gameOrder: 1,
      startingOnOffense: true,
      events: [
        { time: '08:29:54', type: EventType.GAME_START },

        // 1-0 Tech (Cyrus steal → Ellis to Corbin)
        { time: '08:32:57', type: EventType.NOTE, message: 'Cyrus steal' },
        { time: '08:34:11', type: EventType.GOAL, team: 'us', message: 'Ellis to Corbin', defensivePlay: 'steal' },

        // 1-1 Montclair (Toby block but they still scored)
        { time: '08:36:50', type: EventType.NOTE, message: 'Toby block' },
        { time: '08:37:47', type: EventType.GOAL, team: 'them', message: '1-1' },

        // 2-1 Tech (Ellis deep to Corbin)
        { time: '08:39:53', type: EventType.GOAL, team: 'us', message: 'Ellis deep to Corbin' },

        // 3-1 Tech (Toby block → Mason deep to Jake)
        { time: '08:42:25', type: EventType.NOTE, message: 'Toby block' },
        { time: '08:43:06', type: EventType.GOAL, team: 'us', message: 'Mason deep to Jake', defensivePlay: 'block' },

        // 3-2 Montclair
        { time: '08:46:23', type: EventType.GOAL, team: 'them', message: '3-2' },

        // 4-2 Tech (Ellis to Cyrus)
        { time: '08:48:46', type: EventType.GOAL, team: 'us', message: 'Ellis to Cyrus' },

        // 4-3 Montclair
        { time: '08:51:37', type: EventType.GOAL, team: 'them', message: '4-3' },

        // 5-3 Tech (Gus block → Ellis to Alex)
        { time: '08:56:55', type: EventType.NOTE, message: 'Gus block' },
        { time: '08:57:12', type: EventType.GOAL, team: 'us', message: 'Ellis to Alex', defensivePlay: 'block' },

        // 6-3 Tech (Jake steal, Jake block → Mason huck to Jake)
        { time: '08:59:59', type: EventType.NOTE, message: 'Jake steal' },
        { time: '09:02:09', type: EventType.NOTE, message: 'Jake block' },
        { time: '09:04:55', type: EventType.GOAL, team: 'us', message: 'Mason huck to Jake', defensivePlay: 'block' },

        { time: '09:07:03', type: EventType.HALFTIME },
        { time: '09:13:00', type: EventType.SECOND_HALF_START },

        // 6-4 Montclair (Teyo block, Toby block but they still scored)
        { time: '09:14:09', type: EventType.NOTE, message: 'Teyo block' },
        { time: '09:14:35', type: EventType.NOTE, message: 'Toby block' },
        { time: '09:16:11', type: EventType.GOAL, team: 'them', message: '6-4' },

        // 6-5 Montclair
        { time: '09:20:11', type: EventType.GOAL, team: 'them', message: '6-5' },

        // 6-6 Montclair
        { time: '09:29:35', type: EventType.GOAL, team: 'them', message: '6-6' },

        { time: '09:30:16', type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },

        // 7-6 Tech (Jake to Mason)
        { time: '09:36:50', type: EventType.GOAL, team: 'us', message: 'Jake to Mason' },

        // 7-7 was posted then corrected — not a score
        { time: '09:43:03', type: EventType.NOTE, message: 'Correction: 7-7 was not a score, still 7-6' },

        // 8-6 Tech (Toby block → Toby to Jake)
        { time: '09:43:21', type: EventType.NOTE, message: 'Toby block' },
        { time: '09:43:47', type: EventType.GOAL, team: 'us', message: 'Toby to Jake', defensivePlay: 'block' },

        { time: '09:44:24', type: EventType.NOTE, message: 'Soft cap in effect, game to 9' },

        // 8-7 Montclair
        { time: '09:46:16', type: EventType.GOAL, team: 'them', message: '8-7' },

        // 9-7 Tech — GAME WINNER (Alex to Nico)
        { time: '09:50:00', type: EventType.GOAL, team: 'us', message: 'Alex to Nico' },

        { time: '09:50:00', type: EventType.GAME_END },
      ],
    },
  ],
};

async function main() {
  if (!process.argv.includes('--run')) {
    console.log('This is a template. Edit the `spec`, then run with --run to load it:');
    console.log('  SCOREBOT_API_URL=https://api.score.kcuda.org npx tsx scripts/load-example-spec.ts --run');
    console.log(`\nSpec: "${spec.tournament}" — ${spec.games.length} game(s), ${spec.games[0].events.length} events in game 1.`);
    return;
  }
  await loadTournament(spec);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
