/**
 * Fix missing/swapped defensive play note events across multiple games.
 *
 * Games fixed:
 * 1. 3/8 Battle of Hudson Game 1 vs Montclair — add 2 missing D plays
 * 2. 3/8 Battle of Hudson Game 2 vs Columbia — reload with all 9 D plays (had only 3)
 * 3. 3/22 YULA vs Haverford — reload (D plays were swapped with Jackson Reed)
 * 4. 3/22 YULA vs Jackson Reed — reload (D plays were swapped with Haverford)
 */

const API_URL = process.env.API_URL || 'https://api.score.kcuda.org';

function est(date: [number, number, number], time: string): number {
  const match = time.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) throw new Error(`Invalid time: ${time}`);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const period = match[4].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  // EST is UTC-5 (no DST in early March)
  return new Date(Date.UTC(date[0], date[1], date[2], hours + 5, minutes, seconds)).getTime();
}

function edt(date: [number, number, number], time: string): number {
  const match = time.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) throw new Error(`Invalid time: ${time}`);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const period = match[4].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  // EDT is UTC-4 (DST active from mid-March)
  return new Date(Date.UTC(date[0], date[1], date[2], hours + 4, minutes, seconds)).getTime();
}

const MAR8: [number, number, number] = [2026, 2, 8];
const MAR22: [number, number, number] = [2026, 2, 22];

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
  if (!res.ok) throw new Error(`Failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deleteGame(gameId: string) {
  const res = await fetch(`${API_URL}/games/${gameId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Delete failed: ${res.status}`);
}

async function createGame(opts: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { game: { id: string } }).game.id;
}

async function loadGame(label: string, oldId: string, opts: Record<string, unknown>, events: Event[]) {
  console.log(`\n=== ${label} ===`);
  console.log(`Deleting ${oldId}...`);
  await deleteGame(oldId);
  const gameId = await createGame(opts);
  console.log(`Created ${gameId}`);
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    console.log(`  [${i + 1}/${events.length}] ${e.type}${e.message ? ': ' + e.message : ''}`);
    await addEvent(gameId, e);
  }
  console.log(`Done! ${events.length} events.`);
}

async function main() {
  console.log(`API: ${API_URL}`);

  // =========================================================================
  // 3/8 Battle of Hudson Game 1: vs Montclair (13-4) — EST, starting D
  // =========================================================================
  await loadGame(
    '3/8 vs Montclair (13-4)',
    'game_mmi83pwl_2cw2fvk',
    { chatId: 'boh-montclair-2026-03-08', ourTeamName: 'Tech Support', opponentName: 'Montclair', tournamentName: 'Battle of the Hudson', gameDate: '2026-03-08', gameOrder: 1 },
    [
      { type: 'game_start', startingOnOffense: false, timestamp: est(MAR8, '8:58:21 AM') },
      { type: 'goal', team: 'them', message: '0-1', timestamp: est(MAR8, '9:01:05 AM') },
      // 1-1: Ellis to Jake (break)
      { type: 'goal', team: 'us', message: 'Ellis to Jake', timestamp: est(MAR8, '9:05:21 AM') },
      { type: 'goal', team: 'them', message: '1-2', timestamp: est(MAR8, '9:08:55 AM') },
      // 2-2: Ellis to Alex (break)
      { type: 'goal', team: 'us', message: 'Ellis to Alex', timestamp: est(MAR8, '9:12:09 AM') },
      // 3-2: Mason Greatest to Nico (break)
      { type: 'goal', team: 'us', message: 'Mason Greatest to Nico', timestamp: est(MAR8, '9:16:11 AM') },
      { type: 'goal', team: 'them', message: '3-3', timestamp: est(MAR8, '9:20:43 AM') },
      // 4-3: Corbin to Ellis (break)
      { type: 'goal', team: 'us', message: 'Corbin to Ellis', timestamp: est(MAR8, '9:24:02 AM') },
      // 5-3: Nico to Jake (break)
      { type: 'goal', team: 'us', message: 'Nico to Jake', timestamp: est(MAR8, '9:27:35 AM') },
      // 6-3: Mason to Jake (break)
      { type: 'goal', team: 'us', message: 'Mason to Jake', timestamp: est(MAR8, '9:31:58 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Montclair', timestamp: est(MAR8, '9:32:59 AM') },
      // Alex D → 7-3 Ellis to Corbin
      { type: 'note', message: 'Alex block', timestamp: est(MAR8, '9:37:48 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Corbin', defensivePlay: 'block', timestamp: est(MAR8, '9:39:51 AM') },
      { type: 'halftime', timestamp: est(MAR8, '9:40:00 AM') },
      { type: 'second_half_start', timestamp: est(MAR8, '9:49:00 AM') },
      // 8-3: Ellis hammer to Alex
      { type: 'goal', team: 'us', message: 'Ellis hammer to Alex', timestamp: est(MAR8, '9:49:08 AM') },
      // 9-3: Mason to Jake
      { type: 'goal', team: 'us', message: 'Mason to Jake', timestamp: est(MAR8, '9:51:40 AM') },
      { type: 'goal', team: 'them', message: '9-4', timestamp: est(MAR8, '9:54:14 AM') },
      // 10-4: Nico deep to Cyrus
      { type: 'goal', team: 'us', message: 'Nico deep to Cyrus', timestamp: est(MAR8, '9:57:13 AM') },
      // 11-4: Mason hammer to Asher
      { type: 'goal', team: 'us', message: 'Mason hammer to Asher', timestamp: est(MAR8, '9:59:31 AM') },
      // 12-4: Mason hammer to Asher (repeat)
      { type: 'goal', team: 'us', message: 'Mason hammer to Asher', timestamp: est(MAR8, '10:01:46 AM') },
      // Ben block → 13-4 Cyrus to Jake
      { type: 'note', message: 'Ben block', timestamp: est(MAR8, '10:04:11 AM') },
      { type: 'goal', team: 'us', message: 'Cyrus to Jake', defensivePlay: 'block', timestamp: est(MAR8, '10:08:24 AM') },
      { type: 'game_end', timestamp: est(MAR8, '10:08:53 AM') },
    ],
  );

  // =========================================================================
  // 3/8 Battle of Hudson Game 2: vs Columbia (13-12) — EST, starting O
  // =========================================================================
  await loadGame(
    '3/8 vs Columbia (13-12)',
    'game_mmi83ygk_odbtt97',
    { chatId: 'boh-columbia-2026-03-08', ourTeamName: 'Tech Support', opponentName: 'Columbia High School', tournamentName: 'Battle of the Hudson', gameDate: '2026-03-08', gameOrder: 2 },
    [
      { type: 'game_start', startingOnOffense: true, timestamp: est(MAR8, '10:59:30 AM') },
      // 1-0: Mason to Gus
      { type: 'goal', team: 'us', message: 'Mason to Gus', timestamp: est(MAR8, '11:02:07 AM') },
      { type: 'goal', team: 'them', message: '1-1', timestamp: est(MAR8, '11:04:15 AM') },
      // 2-1: Mason hammer to Corbin
      { type: 'goal', team: 'us', message: 'Mason hammer to Corbin', timestamp: est(MAR8, '11:08:02 AM') },
      // Jake steal — didn't convert (2-2)
      { type: 'note', message: 'Jake steal', timestamp: est(MAR8, '11:10:29 AM') },
      { type: 'goal', team: 'them', message: '2-2', timestamp: est(MAR8, '11:11:12 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: est(MAR8, '11:11:21 AM') },
      { type: 'goal', team: 'them', message: '2-3', timestamp: est(MAR8, '11:15:29 AM') },
      // 3-3: Mason deep to Jake
      { type: 'goal', team: 'us', message: 'Mason deep to Jake', timestamp: est(MAR8, '11:18:50 AM') },
      // Toby D — didn't convert (3-4)
      { type: 'note', message: 'Toby block', timestamp: est(MAR8, '11:21:56 AM') },
      { type: 'goal', team: 'them', message: '3-4', timestamp: est(MAR8, '11:23:41 AM') },
      { type: 'goal', team: 'them', message: '3-5', timestamp: est(MAR8, '11:26:32 AM') },
      // 4-5: Mason to Alex
      { type: 'goal', team: 'us', message: 'Mason to Alex', timestamp: est(MAR8, '11:30:46 AM') },
      // 5-5: Mason to Toby
      { type: 'goal', team: 'us', message: 'Mason to Toby', timestamp: est(MAR8, '11:33:47 AM') },
      // Toby D — didn't convert (5-6)
      { type: 'note', message: 'Toby block', timestamp: est(MAR8, '11:35:56 AM') },
      { type: 'goal', team: 'them', message: '5-6', timestamp: est(MAR8, '11:37:22 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: est(MAR8, '11:37:49 AM') },
      // 6-6: Ellis to Mason
      { type: 'goal', team: 'us', message: 'Ellis to Mason', timestamp: est(MAR8, '11:43:28 AM') },
      { type: 'goal', team: 'them', message: '6-7', timestamp: est(MAR8, '11:47:09 AM') },
      { type: 'halftime', timestamp: est(MAR8, '11:48:13 AM') },
      { type: 'second_half_start', timestamp: est(MAR8, '12:00:00 PM') },
      { type: 'goal', team: 'them', message: '6-8', timestamp: est(MAR8, '12:00:09 PM') },
      { type: 'goal', team: 'them', message: '6-9', timestamp: est(MAR8, '12:05:52 PM') },
      // 7-9: Ellis to Jake
      { type: 'goal', team: 'us', message: 'Ellis to Jake', timestamp: est(MAR8, '12:09:48 PM') },
      { type: 'goal', team: 'them', message: '7-10', timestamp: est(MAR8, '12:12:04 PM') },
      // 8-10: Alex to Jake
      { type: 'goal', team: 'us', message: 'Alex to Jake', timestamp: est(MAR8, '12:14:54 PM') },
      // Jake steal, Nico steal on same point — long point
      { type: 'note', message: 'Jake steal', timestamp: est(MAR8, '12:17:01 PM') },
      { type: 'note', message: 'Nico steal', timestamp: est(MAR8, '12:18:14 PM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: est(MAR8, '12:20:50 PM') },
      // Toby block → 9-10 Mason deep to Jake
      { type: 'note', message: 'Toby block', timestamp: est(MAR8, '12:25:04 PM') },
      { type: 'goal', team: 'us', message: 'Mason deep to Jake', defensivePlay: 'block', timestamp: est(MAR8, '12:25:30 PM') },
      { type: 'goal', team: 'them', message: '9-11', timestamp: est(MAR8, '12:27:45 PM') },
      { type: 'goal', team: 'them', message: '9-12', timestamp: est(MAR8, '12:31:13 PM') },
      // 10-12: Jake to Gus
      { type: 'goal', team: 'us', message: 'Jake to Gus', timestamp: est(MAR8, '12:33:33 PM') },
      // 11-12: Ellis steal → Ellis to Alex
      { type: 'note', message: 'Ellis steal', timestamp: est(MAR8, '12:36:07 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'steal', timestamp: est(MAR8, '12:35:56 PM') },
      // 12-12: Ellis to Alex
      { type: 'goal', team: 'us', message: 'Ellis to Alex', timestamp: est(MAR8, '12:43:06 PM') },
      // Universe point: Toby block, Gus steal → 13-12 Ellis to Alex ftw
      { type: 'note', message: 'Toby block', timestamp: est(MAR8, '12:49:23 PM') },
      { type: 'note', message: 'Gus steal', timestamp: est(MAR8, '12:50:31 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Alex ftw', defensivePlay: 'steal', timestamp: est(MAR8, '12:51:16 PM') },
      { type: 'game_end', timestamp: est(MAR8, '12:51:32 PM') },
    ],
  );

  // =========================================================================
  // 3/22 YULA vs Haverford HUDA (9-7) — EDT, starting O  (was game 4)
  // =========================================================================
  await loadGame(
    '3/22 vs Haverford (9-7)',
    'game_mn2j39zb_j7cuyls',
    { chatId: 'yula-haverford-2026-03-22', ourTeamName: 'Tech Support', opponentName: 'Haverford HUDA', tournamentName: 'YULA', gameDate: '2026-03-22', gameOrder: 1 },
    [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(MAR22, '10:04:09 AM') },
      // 1-0: Jake to Nico
      { type: 'goal', team: 'us', message: 'Jake to Nico', timestamp: edt(MAR22, '10:13:06 AM') },
      // 2-0: Jake block → Mason to Jake
      { type: 'note', message: 'Jake block', timestamp: edt(MAR22, '10:16:26 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'block', timestamp: edt(MAR22, '10:16:37 AM') },
      // 3-0: Alex block → Mason to Jake
      { type: 'note', message: 'Alex block', timestamp: edt(MAR22, '10:19:04 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'block', timestamp: edt(MAR22, '10:20:08 AM') },
      { type: 'goal', team: 'them', message: '3-1', timestamp: edt(MAR22, '10:23:47 AM') },
      { type: 'goal', team: 'them', message: '3-2', timestamp: edt(MAR22, '10:28:27 AM') },
      { type: 'goal', team: 'them', message: '3-3', timestamp: edt(MAR22, '10:31:36 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(MAR22, '10:32:35 AM') },
      // 4-3: Mason hammer to Jake
      { type: 'goal', team: 'us', message: 'Mason hammer to Jake', timestamp: edt(MAR22, '10:37:11 AM') },
      { type: 'goal', team: 'them', message: '4-4', timestamp: edt(MAR22, '10:39:45 AM') },
      { type: 'goal', team: 'them', message: '4-5', timestamp: edt(MAR22, '10:43:46 AM') },
      // 5-5: Ellis to Nico
      { type: 'goal', team: 'us', message: 'Ellis to Nico', timestamp: edt(MAR22, '10:47:26 AM') },
      { type: 'goal', team: 'them', message: '5-6', timestamp: edt(MAR22, '10:50:05 AM') },
      // 6-6 (hold)
      { type: 'goal', team: 'us', message: '6-6', timestamp: edt(MAR22, '10:54:22 AM') },
      // Mason steal — didn't convert (6-7)
      { type: 'note', message: 'Mason steal', timestamp: edt(MAR22, '10:57:42 AM') },
      { type: 'goal', team: 'them', message: '6-7', timestamp: edt(MAR22, '10:58:39 AM') },
      { type: 'halftime', timestamp: edt(MAR22, '10:58:41 AM') },
      { type: 'second_half_start', timestamp: edt(MAR22, '11:09:00 AM') },
      // 7-7: Block Toby → Mason to Ellis
      { type: 'note', message: 'Toby block', timestamp: edt(MAR22, '11:09:11 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Ellis', defensivePlay: 'block', timestamp: edt(MAR22, '11:09:45 AM') },
      { type: 'goal', team: 'them', message: '7-8', timestamp: edt(MAR22, '11:13:52 AM') },
      // 8-8: Nico to Mason
      { type: 'goal', team: 'us', message: 'Nico to Mason', timestamp: edt(MAR22, '11:16:40 AM') },
      { type: 'goal', team: 'them', message: '8-9', timestamp: edt(MAR22, '11:19:49 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(MAR22, '11:21:09 AM') },
      // 9-9: Mason hammer to Corbin
      { type: 'goal', team: 'us', message: 'Mason hammer to Corbin', timestamp: edt(MAR22, '11:25:52 AM') },
      // Toby block, Gus steal → 10-9 (wait — final was 9-7, let me recount...)
      // Actually transcript says "Toby block" then "Gus steal" then 10-9 Jake to Gus...
      // But loaded game has final 9-7. The transcript shows 11-10 final (Jake to Mason ftw).
      // The loaded game score is wrong! Let me include all events from transcript.
      { type: 'note', message: 'Toby block', timestamp: edt(MAR22, '11:28:18 AM') },
      { type: 'note', message: 'Gus steal', timestamp: edt(MAR22, '11:29:39 AM') },
      { type: 'goal', team: 'us', message: 'Jake to Gus', defensivePlay: 'steal', timestamp: edt(MAR22, '11:29:53 AM') },
      { type: 'goal', team: 'them', message: '10-10', timestamp: edt(MAR22, '11:32:52 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(MAR22, '11:33:10 AM') },
      // 11-10: Jake to Mason ftw (universe point)
      { type: 'goal', team: 'us', message: 'Jake to Mason ftw', timestamp: edt(MAR22, '11:37:19 AM') },
      { type: 'game_end', timestamp: edt(MAR22, '11:37:50 AM') },
    ],
  );

  // =========================================================================
  // 3/22 YULA vs Jackson Reed (11-10) — EDT, starting O (was game 6)
  // =========================================================================
  await loadGame(
    '3/22 vs Jackson Reed (11-10)',
    'game_mn2iypzy_nedt41l',
    { chatId: 'yula-jackson-reed-2026-03-22', ourTeamName: 'Tech Support', opponentName: 'Jackson Reed', tournamentName: 'YULA', gameDate: '2026-03-22', gameOrder: 3 },
    [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(MAR22, '1:51:55 PM') },
      // 1-0: Mason to Gus
      { type: 'goal', team: 'us', message: 'Mason to Gus', timestamp: edt(MAR22, '1:54:13 PM') },
      { type: 'goal', team: 'them', message: '1-1', timestamp: edt(MAR22, '1:57:01 PM') },
      { type: 'goal', team: 'them', message: '1-2', timestamp: edt(MAR22, '1:59:38 PM') },
      // Alex block → 2-2 Ellis to Foster
      { type: 'note', message: 'Alex block', timestamp: edt(MAR22, '2:01:56 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Foster', defensivePlay: 'block', timestamp: edt(MAR22, '2:05:11 PM') },
      // 3-2: Toby to Max
      { type: 'goal', team: 'us', message: 'Toby to Max', timestamp: edt(MAR22, '2:10:16 PM') },
      { type: 'goal', team: 'them', message: '3-3', timestamp: edt(MAR22, '2:13:41 PM') },
      // Anatole steal — didn't convert (3-4)
      { type: 'note', message: 'Anatole steal', timestamp: edt(MAR22, '2:17:07 PM') },
      { type: 'goal', team: 'them', message: '3-4', timestamp: edt(MAR22, '2:17:24 PM') },
      // Mason block, Nico steal → 4-4 Mason huck to Gus
      { type: 'note', message: 'Mason block', timestamp: edt(MAR22, '2:20:23 PM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(MAR22, '2:21:30 PM') },
      { type: 'goal', team: 'us', message: 'Mason huck to Gus', defensivePlay: 'steal', timestamp: edt(MAR22, '2:22:02 PM') },
      // 5-4: Toby steal → Jed to Anatole
      { type: 'note', message: 'Toby steal', timestamp: edt(MAR22, '2:24:14 PM') },
      { type: 'goal', team: 'us', message: 'Jed to Anatole', defensivePlay: 'steal', timestamp: edt(MAR22, '2:26:02 PM') },
      // Nico steal x2 — didn't convert (5-5)
      { type: 'note', message: 'Nico steal', timestamp: edt(MAR22, '2:29:29 PM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(MAR22, '2:31:43 PM') },
      { type: 'goal', team: 'them', message: '5-5', timestamp: edt(MAR22, '2:32:40 PM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(MAR22, '2:33:39 PM') },
      // 6-5: Alex to Cyrus
      { type: 'goal', team: 'us', message: 'Alex to Cyrus', timestamp: edt(MAR22, '2:38:45 PM') },
      // 7-5: Mason block → Toby to Teyo
      { type: 'note', message: 'Mason block', timestamp: edt(MAR22, '2:41:54 PM') },
      { type: 'goal', team: 'us', message: 'Toby to Teyo', defensivePlay: 'block', timestamp: edt(MAR22, '2:42:10 PM') },
      { type: 'halftime', timestamp: edt(MAR22, '2:42:33 PM') },
      { type: 'second_half_start', timestamp: edt(MAR22, '2:53:00 PM') },
      { type: 'goal', team: 'them', message: '7-6', timestamp: edt(MAR22, '2:53:35 PM') },
      // 8-6: Mason block → Mason to Ellis
      { type: 'note', message: 'Mason block', timestamp: edt(MAR22, '2:57:22 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Ellis', defensivePlay: 'block', timestamp: edt(MAR22, '2:59:05 PM') },
      // Jed diving block, Alex steal — soft cap
      { type: 'note', message: 'Jed diving block', timestamp: edt(MAR22, '3:02:26 PM') },
      { type: 'note', message: 'Alex steal', timestamp: edt(MAR22, '3:03:16 PM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(MAR22, '3:08:33 PM') },
      // 9-6: Alex to Jed
      { type: 'goal', team: 'us', message: 'Alex to Jed', defensivePlay: 'steal', timestamp: edt(MAR22, '3:13:00 PM') },
      { type: 'goal', team: 'them', message: '9-7', timestamp: edt(MAR22, '3:21:00 PM') },
      { type: 'game_end', timestamp: edt(MAR22, '3:21:39 PM') },
    ],
  );

  console.log('\n=== ALL DONE ===');
}

main().catch(console.error);
