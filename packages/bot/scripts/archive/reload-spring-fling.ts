/**
 * Reload all 5 Spring Fling games with defensive play note events
 * Adds block/steal notes that were missing from original load
 * Spring Fling: April 18-19, 2026 at Turkey Swamp, NJ
 */

const API_URL = process.env.API_URL || 'https://api.score.kcuda.org';

/** Convert "H:MM:SS AM/PM" EDT on given date to Unix ms */
function edt(date: [number, number, number], time: string): number {
  const match = time.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) throw new Error(`Invalid time: ${time}`);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const period = match[4].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return new Date(Date.UTC(date[0], date[1], date[2], hours + 4, minutes, seconds)).getTime();
}

const APR18: [number, number, number] = [2026, 3, 18]; // month is 0-indexed
const APR19: [number, number, number] = [2026, 3, 19];

type Event = {
  type: string;
  team?: string;
  message?: string;
  defensivePlay?: 'block' | 'steal';
  startingOnOffense?: boolean;
  timestamp: number;
  score?: { us: number; them: number };
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

async function deleteGame(gameId: string) {
  const res = await fetch(`${API_URL}/games/${gameId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete game ${gameId}: ${res.status}`);
  }
}

async function createGame(opts: {
  chatId: string;
  ourTeamName: string;
  opponentName: string;
  tournamentName: string;
  gameDate: string;
  gameOrder: number;
}): Promise<string> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`Failed to create game: ${res.status} ${await res.text()}`);
  const data = await res.json() as { game: { id: string } };
  return data.game.id;
}

async function loadGame(
  name: string,
  oldGameId: string,
  chatId: string,
  opponent: string,
  gameDate: string,
  gameOrder: number,
  startingOnOffense: boolean,
  events: Event[],
) {
  console.log(`\n=== ${name} ===`);

  // Delete old game
  console.log(`Deleting old game ${oldGameId}...`);
  await deleteGame(oldGameId);

  // Create new game
  const gameId = await createGame({
    chatId,
    ourTeamName: 'Tech Support',
    opponentName: opponent,
    tournamentName: 'Spring Fling',
    gameDate,
    gameOrder,
  });
  console.log(`Created game: ${gameId}`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const label = event.message ? `: ${event.message}` : '';
    console.log(`  [${i + 1}/${events.length}] ${event.type}${label}`);
    await addEvent(gameId, event);
  }

  console.log(`Done! ${events.length} events loaded.`);
  return gameId;
}

async function main() {
  console.log(`Using API: ${API_URL}`);

  // =====================================================
  // GAME 1: vs Wissahickon (10-6) — Apr 18, Game 1
  // =====================================================
  await loadGame(
    'vs Wissahickon (10-6)',
    'game_mo954hkc_jfs3ikd',
    'sf-wissahickon-2026-04-18',
    'Wissahickon',
    '2026-04-18',
    1,
    true, // starting O
    [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(APR18, '10:58:22 AM') },
      // Ellis block on Tech's O point — didn't convert
      { type: 'note', message: 'Ellis block', timestamp: edt(APR18, '11:01:10 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Wissahickon', timestamp: edt(APR18, '11:04:54 AM') },
      { type: 'goal', team: 'them', message: '0-1', timestamp: edt(APR18, '11:07:57 AM') },
      // 1-1: Nico block → Ellis to Alex
      { type: 'note', message: 'Nico block', timestamp: edt(APR18, '11:10:46 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'block', timestamp: edt(APR18, '11:11:57 AM') },
      { type: 'goal', team: 'them', message: '1-2', timestamp: edt(APR18, '11:14:40 AM') },
      // 2-2: Alex to diving Ellis (hold)
      { type: 'goal', team: 'us', message: 'Alex to diving Ellis', timestamp: edt(APR18, '11:17:05 AM') },
      // 3-2: Toby block → Jake to Foster
      { type: 'note', message: 'Toby block', timestamp: edt(APR18, '11:19:06 AM') },
      { type: 'goal', team: 'us', message: 'Jake to Foster', defensivePlay: 'block', timestamp: edt(APR18, '11:19:33 AM') },
      { type: 'goal', team: 'them', message: '3-3', timestamp: edt(APR18, '11:22:31 AM') },
      // 4-3: Alex to Anatole (hold)
      { type: 'goal', team: 'us', message: 'Alex to Anatole', timestamp: edt(APR18, '11:26:46 AM') },
      // Toby block — didn't convert, Wiss scored 4-4
      { type: 'note', message: 'Toby block', timestamp: edt(APR18, '11:29:34 AM') },
      { type: 'goal', team: 'them', message: '4-4', timestamp: edt(APR18, '11:30:34 AM') },
      // 5-4: Corbin block → Nate to Mason
      { type: 'note', message: 'Corbin block', timestamp: edt(APR18, '11:34:05 AM') },
      { type: 'goal', team: 'us', message: 'Nate to Mason', defensivePlay: 'block', timestamp: edt(APR18, '11:34:32 AM') },
      // 6-4: Jake to Nate (hold)
      { type: 'goal', team: 'us', message: 'Jake to Nate', timestamp: edt(APR18, '11:39:18 AM') },
      { type: 'timeout', team: 'us', message: 'Tech timeout', timestamp: edt(APR18, '11:39:29 AM') },
      // 7-4: Ellis to Jake (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Jake', timestamp: edt(APR18, '11:42:41 AM') },
      { type: 'halftime', timestamp: edt(APR18, '11:42:45 AM') },
      { type: 'second_half_start', timestamp: edt(APR18, '11:52:00 AM') },
      // 8-4: Toby to Jake (hold)
      { type: 'goal', team: 'us', message: 'Toby to Jake', timestamp: edt(APR18, '11:52:32 AM') },
      // 9-4: Gus steal, Mason block → Mason to Ellis
      { type: 'note', message: 'Gus steal', timestamp: edt(APR18, '11:55:19 AM') },
      { type: 'note', message: 'Mason block', timestamp: edt(APR18, '12:00:41 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Ellis', defensivePlay: 'block', timestamp: edt(APR18, '12:01:42 PM') },
      { type: 'goal', team: 'them', message: '9-5', timestamp: edt(APR18, '12:06:46 PM') },
      { type: 'goal', team: 'them', message: '9-6', timestamp: edt(APR18, '12:10:54 PM') },
      // 10-6: Ellis to Alex ftw (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Alex ftw', timestamp: edt(APR18, '12:13:35 PM') },
      { type: 'game_end', timestamp: edt(APR18, '12:13:38 PM') },
    ],
  );

  // =====================================================
  // GAME 2: vs Stuyvesant (13-4) — Apr 18, Game 2
  // =====================================================
  await loadGame(
    'vs Stuyvesant (13-4)',
    'game_mo954qn5_9bbdb8o',
    'sf-stuyvesant-2026-04-18',
    'Stuyvesant',
    '2026-04-18',
    2,
    true, // starting O
    [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(APR18, '12:41:19 PM') },
      // 1-0: Marley to Nate (hold)
      { type: 'goal', team: 'us', message: 'Marley to Nate', timestamp: edt(APR18, '12:42:52 PM') },
      // 2-0: Asher block → Teyo to Foster
      { type: 'note', message: 'Asher block', timestamp: edt(APR18, '12:47:02 PM') },
      { type: 'goal', team: 'us', message: 'Teyo to Foster', defensivePlay: 'block', timestamp: edt(APR18, '12:47:31 PM') },
      // 3-0: Nico steal → Nico to Cyrus
      { type: 'note', message: 'Nico steal', timestamp: edt(APR18, '12:50:23 PM') },
      { type: 'goal', team: 'us', message: 'Nico to Cyrus', defensivePlay: 'steal', timestamp: edt(APR18, '12:53:12 PM') },
      // 4-0: Asher block, Mason block → Asher layout Callahan
      { type: 'note', message: 'Asher block', timestamp: edt(APR18, '12:55:41 PM') },
      { type: 'note', message: 'Mason block', timestamp: edt(APR18, '12:56:07 PM') },
      { type: 'goal', team: 'us', message: 'Asher layout Callahan', defensivePlay: 'block', timestamp: edt(APR18, '12:57:27 PM') },
      // 5-0: Anatole to Ben (hold)
      { type: 'goal', team: 'us', message: 'Anatole to Ben', timestamp: edt(APR18, '1:01:37 PM') },
      { type: 'goal', team: 'them', message: '5-1', timestamp: edt(APR18, '1:04:09 PM') },
      // 6-1: Noah block, Nate block → Asher to Nate
      { type: 'note', message: 'Noah block', timestamp: edt(APR18, '1:07:19 PM') },
      { type: 'note', message: 'Nate block', timestamp: edt(APR18, '1:07:20 PM') },
      { type: 'goal', team: 'us', message: 'Asher to Nate', defensivePlay: 'block', timestamp: edt(APR18, '1:07:23 PM') },
      // 7-1: Ben block → Theo to Ben
      { type: 'note', message: 'Ben block', timestamp: edt(APR18, '1:10:46 PM') },
      { type: 'goal', team: 'us', message: 'Theo to Ben', defensivePlay: 'block', timestamp: edt(APR18, '1:11:16 PM') },
      { type: 'halftime', timestamp: edt(APR18, '1:11:40 PM') },
      { type: 'second_half_start', timestamp: edt(APR18, '1:21:00 PM') },
      // 8-1: Asher block → Mason to Noah
      { type: 'note', message: 'Asher block', timestamp: edt(APR18, '1:21:28 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Noah', defensivePlay: 'block', timestamp: edt(APR18, '1:21:47 PM') },
      // 9-1: Nate block → Ellis to Alex
      { type: 'note', message: 'Nate block', timestamp: edt(APR18, '1:23:56 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'block', timestamp: edt(APR18, '1:24:15 PM') },
      // 10-1: Theo to Nico (hold)
      { type: 'goal', team: 'us', message: 'Theo to Nico', timestamp: edt(APR18, '1:27:02 PM') },
      { type: 'timeout', team: 'them', message: 'Timeout Stuyvesant', timestamp: edt(APR18, '1:27:22 PM') },
      { type: 'goal', team: 'them', message: '10-2', timestamp: edt(APR18, '1:34:51 PM') },
      // 11-2: Nate to Foster (hold)
      { type: 'goal', team: 'us', message: 'Nate to Foster', timestamp: edt(APR18, '1:37:35 PM') },
      { type: 'timeout', team: 'them', message: 'Timeout Stuyvesant', timestamp: edt(APR18, '1:39:00 PM') },
      // Nico steal — didn't convert, Stuy scored 11-3
      { type: 'note', message: 'Nico steal', timestamp: edt(APR18, '1:44:55 PM') },
      { type: 'goal', team: 'them', message: '11-3', timestamp: edt(APR18, '1:45:26 PM') },
      // 12-3: Ellis to Alex (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Alex', timestamp: edt(APR18, '1:47:27 PM') },
      // Jed block — didn't convert, Stuy scored 12-4
      { type: 'note', message: 'Jed block', timestamp: edt(APR18, '1:49:38 PM') },
      { type: 'goal', team: 'them', message: '12-4', timestamp: edt(APR18, '1:51:42 PM') },
      // 13-4: Ellis to Corbin ftw (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Corbin ftw', timestamp: edt(APR18, '1:54:09 PM') },
      { type: 'game_end', timestamp: edt(APR18, '1:54:16 PM') },
    ],
  );

  // =====================================================
  // GAME 3: vs HB Woodlawn (13-8) — Apr 18, Game 3
  // =====================================================
  await loadGame(
    'vs HB Woodlawn (13-8)',
    'game_mo954zg8_0a494tg',
    'sf-hbwoodlawn-2026-04-18',
    'HB Woodlawn',
    '2026-04-18',
    3,
    false, // starting D
    [
      { type: 'game_start', startingOnOffense: false, timestamp: edt(APR18, '2:16:15 PM') },
      // 1-0: Jed steal → Mason to Jake
      { type: 'note', message: 'Jed steal', timestamp: edt(APR18, '2:20:55 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'steal', timestamp: edt(APR18, '2:22:01 PM') },
      // Mason block — didn't convert, HBW scored 1-1
      { type: 'note', message: 'Mason block', timestamp: edt(APR18, '2:23:48 PM') },
      { type: 'goal', team: 'them', message: '1-1', timestamp: edt(APR18, '2:24:37 PM') },
      // 2-1: Nate to Corbin (hold)
      { type: 'goal', team: 'us', message: 'Nate to Corbin', timestamp: edt(APR18, '2:28:45 PM') },
      // 3-1: Jake steal → Foster to Nico
      { type: 'note', message: 'Jake steal', timestamp: edt(APR18, '2:31:16 PM') },
      { type: 'goal', team: 'us', message: 'Foster to Nico', defensivePlay: 'steal', timestamp: edt(APR18, '2:31:32 PM') },
      // 4-1: Alex to Jake (hold)
      { type: 'goal', team: 'us', message: 'Alex to Jake', timestamp: edt(APR18, '2:35:07 PM') },
      { type: 'timeout', team: 'them', message: 'Timeout HB Woodlawn', timestamp: edt(APR18, '2:35:32 PM') },
      { type: 'goal', team: 'them', message: '4-2', timestamp: edt(APR18, '2:39:01 PM') },
      // 5-2: Alex to Corbin (hold)
      { type: 'goal', team: 'us', message: 'Alex to Corbin', timestamp: edt(APR18, '2:41:34 PM') },
      // 6-2: Nico block → Mason to Toby
      { type: 'note', message: 'Nico block', timestamp: edt(APR18, '2:43:33 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Toby', defensivePlay: 'block', timestamp: edt(APR18, '2:44:39 PM') },
      // 7-2: Mason block → Mason to Nico
      { type: 'note', message: 'Mason block', timestamp: edt(APR18, '2:46:28 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Nico', defensivePlay: 'block', timestamp: edt(APR18, '2:46:53 PM') },
      { type: 'halftime', timestamp: edt(APR18, '2:47:01 PM') },
      { type: 'second_half_start', timestamp: edt(APR18, '2:56:00 PM') },
      { type: 'goal', team: 'them', message: '7-3', timestamp: edt(APR18, '2:56:40 PM') },
      { type: 'goal', team: 'them', message: '7-4', timestamp: edt(APR18, '3:00:30 PM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(APR18, '3:02:38 PM') },
      { type: 'goal', team: 'them', message: '7-5', timestamp: edt(APR18, '3:04:46 PM') },
      // 8-5: Ellis steal → Mason to Jake
      { type: 'note', message: 'Ellis steal', timestamp: edt(APR18, '3:08:04 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'steal', timestamp: edt(APR18, '3:08:11 PM') },
      // 9-5: Jake block → Nico to Jake
      { type: 'note', message: 'Jake block', timestamp: edt(APR18, '3:09:57 PM') },
      { type: 'goal', team: 'us', message: 'Nico to Jake', defensivePlay: 'block', timestamp: edt(APR18, '3:12:57 PM') },
      // 10-5: Mason hammer to Max (hold)
      { type: 'goal', team: 'us', message: 'Mason hammer to Max', timestamp: edt(APR18, '3:15:22 PM') },
      { type: 'goal', team: 'them', message: '10-6', timestamp: edt(APR18, '3:18:18 PM') },
      // 11-6: Mason to Alex (hold)
      { type: 'goal', team: 'us', message: 'Mason to Alex', timestamp: edt(APR18, '3:21:59 PM') },
      // 12-6: Nico to Jake (hold)
      { type: 'goal', team: 'us', message: 'Nico to Jake', timestamp: edt(APR18, '3:24:30 PM') },
      { type: 'goal', team: 'them', message: '12-7', timestamp: edt(APR18, '3:27:16 PM') },
      // Corbin steal — didn't convert, HBW scored 12-8
      { type: 'note', message: 'Corbin steal', timestamp: edt(APR18, '3:30:12 PM') },
      { type: 'goal', team: 'them', message: '12-8', timestamp: edt(APR18, '3:31:04 PM') },
      // 13-8: Jake to Nico ftw (hold)
      { type: 'goal', team: 'us', message: 'Jake to Nico ftw', timestamp: edt(APR18, '3:33:15 PM') },
      { type: 'game_end', timestamp: edt(APR18, '3:33:22 PM') },
    ],
  );

  // =====================================================
  // GAME 4: vs Blair (13-8) — Apr 19, Game 1
  // =====================================================
  await loadGame(
    'vs Blair (13-8)',
    'game_mo955b3y_vgc4d5r',
    'sf-blair-2026-04-19',
    'Blair',
    '2026-04-19',
    1,
    true, // starting O
    [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(APR19, '9:26:46 AM') },
      // 1-0: Alex to Ellis (hold)
      { type: 'goal', team: 'us', message: 'Alex to Ellis', timestamp: edt(APR19, '9:34:20 AM') },
      // 2-0: Mason block → Jake to Ellis
      { type: 'note', message: 'Mason block', timestamp: edt(APR19, '9:36:20 AM') },
      { type: 'goal', team: 'us', message: 'Jake to Ellis', defensivePlay: 'block', timestamp: edt(APR19, '9:36:24 AM') },
      { type: 'goal', team: 'them', message: '2-1', timestamp: edt(APR19, '9:38:28 AM') },
      { type: 'goal', team: 'them', message: '2-2', timestamp: edt(APR19, '9:40:57 AM') },
      { type: 'goal', team: 'them', message: '2-3', timestamp: edt(APR19, '9:44:28 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(APR19, '9:44:36 AM') },
      // 3-3: Ellis to Alex (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Alex', timestamp: edt(APR19, '9:47:53 AM') },
      // 4-3: Mason to Jake (hold)
      { type: 'goal', team: 'us', message: 'Mason to Jake', timestamp: edt(APR19, '9:50:45 AM') },
      { type: 'goal', team: 'them', message: '4-4', timestamp: edt(APR19, '9:55:56 AM') },
      // 5-4: Jake block → Ellis to Alex
      { type: 'note', message: 'Jake block', timestamp: edt(APR19, '9:59:07 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'block', timestamp: edt(APR19, '9:59:54 AM') },
      // Toby block — didn't convert, Blair scored 5-5
      { type: 'note', message: 'Toby block', timestamp: edt(APR19, '10:02:52 AM') },
      { type: 'goal', team: 'them', message: '5-5', timestamp: edt(APR19, '10:06:26 AM') },
      // 6-5: Jake to Max (hold)
      { type: 'goal', team: 'us', message: 'Jake to Max', timestamp: edt(APR19, '10:08:56 AM') },
      { type: 'goal', team: 'them', message: '6-6', timestamp: edt(APR19, '10:12:54 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(APR19, '10:13:46 AM') },
      // 7-6: Ellis huck to Gus (hold)
      { type: 'goal', team: 'us', message: 'Ellis huck to Gus', timestamp: edt(APR19, '10:16:15 AM') },
      { type: 'halftime', timestamp: edt(APR19, '10:16:29 AM') },
      { type: 'second_half_start', timestamp: edt(APR19, '10:27:00 AM') },
      // 8-6: Nico to Foster (break — "Break" noted in transcript but no D play callout)
      { type: 'goal', team: 'us', message: 'Nico to Foster', timestamp: edt(APR19, '10:27:09 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Blair', timestamp: edt(APR19, '10:29:12 AM') },
      { type: 'goal', team: 'them', message: '8-7', timestamp: edt(APR19, '10:31:02 AM') },
      // 9-7: Nico to Alex (hold)
      { type: 'goal', team: 'us', message: 'Nico to Alex', timestamp: edt(APR19, '10:32:55 AM') },
      { type: 'goal', team: 'them', message: '9-8', timestamp: edt(APR19, '10:36:10 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Blair', timestamp: edt(APR19, '10:38:18 AM') },
      // 10-8: Nico to Ellis (hold)
      { type: 'goal', team: 'us', message: 'Nico to Ellis', timestamp: edt(APR19, '10:41:01 AM') },
      // 11-8: Foster/Anatole block, Mason block, Foster block → Mason to Nico
      { type: 'note', message: 'Foster block', timestamp: edt(APR19, '10:43:29 AM') },
      { type: 'note', message: 'Anatole block', timestamp: edt(APR19, '10:43:30 AM') },
      { type: 'note', message: 'Mason block', timestamp: edt(APR19, '10:45:47 AM') },
      { type: 'note', message: 'Foster block', timestamp: edt(APR19, '10:46:27 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Nico', defensivePlay: 'block', timestamp: edt(APR19, '10:46:45 AM') },
      // 12-8: Cyrus block → Alex to Cyrus
      { type: 'note', message: 'Cyrus block', timestamp: edt(APR19, '10:48:27 AM') },
      { type: 'goal', team: 'us', message: 'Alex to Cyrus', defensivePlay: 'block', timestamp: edt(APR19, '10:49:19 AM') },
      // 13-8: Mason block → Mason to Jake ftw
      { type: 'note', message: 'Mason block', timestamp: edt(APR19, '10:52:46 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Jake ftw', defensivePlay: 'block', timestamp: edt(APR19, '10:56:33 AM') },
      { type: 'game_end', timestamp: edt(APR19, '10:56:47 AM') },
    ],
  );

  // =====================================================
  // GAME 5: vs Columbia (12-13) — Apr 19, Game 2
  // =====================================================
  await loadGame(
    'vs Columbia (12-13)',
    'game_mo955osq_6dg8crx',
    'sf-columbia-2026-04-19',
    'Columbia',
    '2026-04-19',
    2,
    true, // starting O
    [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(APR19, '11:20:54 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Columbia', timestamp: edt(APR19, '11:31:18 AM') },
      // 1-0: Ellis steal → Ellis to Alex
      { type: 'note', message: 'Ellis steal', timestamp: edt(APR19, '11:33:23 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Alex', defensivePlay: 'steal', timestamp: edt(APR19, '11:33:26 AM') },
      { type: 'goal', team: 'them', message: '1-1', timestamp: edt(APR19, '11:35:50 AM') },
      // 2-1: Ellis to Mason (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Mason', timestamp: edt(APR19, '11:38:05 AM') },
      { type: 'goal', team: 'them', message: '2-2', timestamp: edt(APR19, '11:40:01 AM') },
      // 3-2: Nate to Jake (hold)
      { type: 'goal', team: 'us', message: 'Nate to Jake', timestamp: edt(APR19, '11:42:45 AM') },
      { type: 'goal', team: 'them', message: '3-3', timestamp: edt(APR19, '11:44:33 AM') },
      // 4-3: Mason to Alex (hold)
      { type: 'goal', team: 'us', message: 'Mason to Alex', timestamp: edt(APR19, '11:46:47 AM') },
      // Jake block — didn't convert, Columbia scored 4-4
      { type: 'note', message: 'Jake block', timestamp: edt(APR19, '11:48:46 AM') },
      { type: 'goal', team: 'them', message: '4-4', timestamp: edt(APR19, '11:49:18 AM') },
      { type: 'goal', team: 'them', message: '4-5', timestamp: edt(APR19, '11:51:34 AM') },
      // 5-5: Ellis to Gus (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Gus', timestamp: edt(APR19, '11:53:59 AM') },
      // 6-5: Ellis steal → Ellis to Mason
      { type: 'note', message: 'Ellis steal', timestamp: edt(APR19, '11:59:13 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Mason', defensivePlay: 'steal', timestamp: edt(APR19, '12:01:23 PM') },
      // 7-5: Mason to Jake (break — noted in transcript)
      { type: 'goal', team: 'us', message: 'Mason to Jake', timestamp: edt(APR19, '12:04:34 PM') },
      { type: 'halftime', timestamp: edt(APR19, '12:04:46 PM') },
      { type: 'second_half_start', timestamp: edt(APR19, '12:13:00 PM') },
      { type: 'goal', team: 'them', message: '7-6', timestamp: edt(APR19, '12:13:48 PM') },
      { type: 'goal', team: 'them', message: '7-7', timestamp: edt(APR19, '12:15:38 PM') },
      // 8-7: Ellis block → Mason to Corbin (with Jake assist)
      { type: 'note', message: 'Ellis block', timestamp: edt(APR19, '12:17:48 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Corbin', defensivePlay: 'block', timestamp: edt(APR19, '12:20:26 PM') },
      // 9-7: Jake block → Gus to Jake
      { type: 'note', message: 'Jake block', timestamp: edt(APR19, '12:22:32 PM') },
      { type: 'goal', team: 'us', message: 'Gus to Jake', defensivePlay: 'block', timestamp: edt(APR19, '12:24:34 PM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(APR19, '12:26:02 PM') },
      { type: 'goal', team: 'them', message: '9-8', timestamp: edt(APR19, '12:29:40 PM') },
      // 10-8: Mason block → Ellis to Jake
      { type: 'note', message: 'Mason block', timestamp: edt(APR19, '12:32:12 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Jake', defensivePlay: 'block', timestamp: edt(APR19, '12:32:51 PM') },
      { type: 'goal', team: 'them', message: '10-9', timestamp: edt(APR19, '12:35:26 PM') },
      // 11-9: Ellis to Jake (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Jake', timestamp: edt(APR19, '12:38:14 PM') },
      // Jake block — didn't convert, Columbia scored 11-10
      { type: 'note', message: 'Jake block', timestamp: edt(APR19, '12:39:59 PM') },
      { type: 'goal', team: 'them', message: '11-10', timestamp: edt(APR19, '12:41:47 PM') },
      { type: 'goal', team: 'them', message: '11-11', timestamp: edt(APR19, '12:45:34 PM') },
      // Gus block — didn't convert after timeout
      { type: 'note', message: 'Gus block', timestamp: edt(APR19, '12:47:58 PM') },
      { type: 'timeout', team: 'them', message: 'Timeout Columbia', timestamp: edt(APR19, '12:49:29 PM') },
      { type: 'goal', team: 'them', message: '11-12', timestamp: edt(APR19, '12:51:25 PM') },
      // 12-12: Ellis to Mason (hold)
      { type: 'goal', team: 'us', message: 'Ellis to Mason', timestamp: edt(APR19, '12:54:29 PM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(APR19, '12:54:52 PM') },
      // 12-13: Columbia wins universe point
      { type: 'goal', team: 'them', message: '12-13', timestamp: edt(APR19, '12:57:46 PM') },
      { type: 'game_end', timestamp: edt(APR19, '12:57:46 PM') },
    ],
  );

  console.log('\n=== ALL DONE ===');
}

main().catch(console.error);
