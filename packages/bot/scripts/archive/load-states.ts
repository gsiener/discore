/**
 * Load 2026 NY State High School Ultimate Championship games (5/23-5/24).
 * Tech Support went 5-0 and won back-to-back state championships.
 *
 * Game 1: Tech vs Regis       — W 9-8   (5/23)
 * Game 2: Tech vs Murrow      — W 15-5  (5/23)
 * Game 3: Tech vs Bard        — W 13-8  (5/24)
 * Game 4: Tech vs Scarsdale   — W 11-9  (5/24)
 * Game 5: Tech vs Bethlehem   — W 15-5  (5/24 — final)
 */

const API_URL = process.env.API_URL || 'https://scorebot-api.siener.workers.dev';

function edt(day: number, time: string): number {
  const match = time.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) throw new Error(`Invalid time: ${time}`);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const period = match[4].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  // May 2026 is EDT (UTC-4). Year=2026, month=4 (May, 0-indexed).
  return new Date(Date.UTC(2026, 4, day, hours + 4, minutes, seconds)).getTime();
}

type Event = {
  type: string;
  team?: string;
  message?: string;
  defensivePlay?: 'block' | 'steal';
  startingOnOffense?: boolean;
  timestamp: number;
};

type Game = {
  chatId: string;
  opponentName: string;
  gameDate: string;
  gameOrder: number;
  events: Event[];
};

const games: Game[] = [
  // ---------------- Game 1: vs Regis — W 9-8 (5/23) ----------------
  {
    chatId: 'states-regis-2026-05-23',
    opponentName: 'Regis',
    gameDate: '2026-05-23',
    gameOrder: 1,
    events: [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(23, '11:02:35 AM') },
      { type: 'note', message: 'Cyrus block', timestamp: edt(23, '11:03:41 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Corbin', timestamp: edt(23, '11:08:39 AM') },
      { type: 'note', message: 'Foster steal', timestamp: edt(23, '11:11:39 AM') },
      { type: 'goal', team: 'them', message: '1-1', defensivePlay: 'steal', timestamp: edt(23, '11:12:45 AM') },
      { type: 'goal', team: 'them', message: '1-2', timestamp: edt(23, '11:15:28 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(23, '11:16:20 AM') },
      { type: 'goal', team: 'us', message: 'Cyrus to Gus', timestamp: edt(23, '11:20:09 AM') },
      { type: 'note', message: 'Asher block', timestamp: edt(23, '11:22:08 AM') },
      { type: 'note', message: 'Asher block again', timestamp: edt(23, '11:23:25 AM') },
      { type: 'goal', team: 'them', message: '2-3', timestamp: edt(23, '11:24:42 AM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(23, '11:26:50 AM') },
      { type: 'goal', team: 'them', message: '2-4', defensivePlay: 'steal', timestamp: edt(23, '11:29:56 AM') },
      { type: 'goal', team: 'them', message: '2-5', timestamp: edt(23, '11:32:53 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Asher', timestamp: edt(23, '11:35:13 AM') },
      { type: 'note', message: 'Mason foot block', timestamp: edt(23, '11:37:34 AM') },
      { type: 'goal', team: 'them', message: '3-6', defensivePlay: 'block', timestamp: edt(23, '11:46:55 AM') },
      { type: 'note', message: 'Mason block', timestamp: edt(23, '11:52:52 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Corbin', defensivePlay: 'block', timestamp: edt(23, '11:53:44 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Regis', timestamp: edt(23, '11:53:56 AM') },
      { type: 'note', message: 'Gus steal', timestamp: edt(23, '11:58:29 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Max', defensivePlay: 'steal', timestamp: edt(23, '12:00:34 PM') },
      { type: 'note', message: 'Jake block', timestamp: edt(23, '12:02:37 PM') },
      { type: 'note', message: 'Stall turnover to Tech', timestamp: edt(23, '12:06:16 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Jake', defensivePlay: 'block', timestamp: edt(23, '12:06:35 PM') },
      { type: 'note', message: 'Jake block', timestamp: edt(23, '12:09:30 PM') },
      { type: 'goal', team: 'us', message: 'Mason hammer to Ben', defensivePlay: 'block', timestamp: edt(23, '12:10:23 PM') },
      { type: 'goal', team: 'them', message: '7-7', timestamp: edt(23, '12:13:42 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Cyrus', timestamp: edt(23, '12:16:54 PM') },
      { type: 'halftime', timestamp: edt(23, '12:17:05 PM') },
      { type: 'second_half_start', timestamp: edt(23, '12:25:00 PM') },
      { type: 'note', message: 'Mason block', timestamp: edt(23, '12:26:59 PM') },
      { type: 'goal', team: 'us', message: 'Jed to Teyo', defensivePlay: 'block', timestamp: edt(23, '12:29:40 PM') },
      { type: 'note', message: 'Nate block', timestamp: edt(23, '12:31:51 PM') },
      { type: 'note', message: 'Ellis block', timestamp: edt(23, '12:35:27 PM') },
      { type: 'goal', team: 'them', message: '9-8', timestamp: edt(23, '12:35:55 PM') },
      { type: 'game_end', message: 'Tech win 9-8', timestamp: edt(23, '12:36:08 PM') },
    ],
  },

  // ---------------- Game 2: vs Murrow — W 15-5 (5/23) ----------------
  {
    chatId: 'states-murrow-2026-05-23',
    opponentName: 'Murrow',
    gameDate: '2026-05-23',
    gameOrder: 2,
    events: [
      { type: 'game_start', startingOnOffense: false, timestamp: edt(23, '1:02:29 PM') },
      { type: 'goal', team: 'them', message: '0-1', timestamp: edt(23, '1:04:20 PM') },
      { type: 'goal', team: 'us', message: 'Marley to Gus', timestamp: edt(23, '1:06:43 PM') },
      { type: 'note', message: 'Ben block to Foster block', timestamp: edt(23, '1:11:21 PM') },
      { type: 'goal', team: 'us', message: 'Asher to Max', defensivePlay: 'block', timestamp: edt(23, '1:13:26 PM') },
      { type: 'note', message: 'Jake block', timestamp: edt(23, '1:16:30 PM') },
      { type: 'goal', team: 'us', message: 'Jake to Cyrus', defensivePlay: 'block', timestamp: edt(23, '1:17:00 PM') },
      { type: 'goal', team: 'them', message: '3-2', timestamp: edt(23, '1:19:55 PM') },
      { type: 'note', message: 'Ellis block', timestamp: edt(23, '1:23:07 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Nate', defensivePlay: 'block', timestamp: edt(23, '1:23:12 PM') },
      { type: 'goal', team: 'them', message: '4-3', timestamp: edt(23, '1:25:26 PM') },
      { type: 'goal', team: 'us', message: 'Gus to Foster (after deep Ellis to Gus)', timestamp: edt(23, '1:27:50 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Asher', timestamp: edt(23, '1:30:20 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Foster', timestamp: edt(23, '1:33:32 PM') },
      { type: 'goal', team: 'them', message: '7-4', timestamp: edt(23, '1:37:12 PM') },
      { type: 'timeout', team: 'them', message: 'Timeout Murrow', timestamp: edt(23, '1:38:13 PM') },
      { type: 'note', message: 'Corbin block', timestamp: edt(23, '1:41:15 PM') },
      { type: 'goal', team: 'us', message: 'Mason deep to Nico', defensivePlay: 'block', timestamp: edt(23, '1:41:47 PM') },
      { type: 'halftime', timestamp: edt(23, '1:41:57 PM') },
      { type: 'second_half_start', timestamp: edt(23, '1:50:00 PM') },
      { type: 'goal', team: 'them', message: '8-5', timestamp: edt(23, '1:52:45 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Asher', timestamp: edt(23, '1:55:52 PM') },
      { type: 'note', message: 'Asher block', timestamp: edt(23, '1:58:32 PM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(23, '1:59:26 PM') },
      { type: 'goal', team: 'us', message: 'Jake to Ben', defensivePlay: 'steal', timestamp: edt(23, '1:59:33 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Cyrus', timestamp: edt(23, '2:03:29 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Nico', timestamp: edt(23, '2:07:24 PM') },
      { type: 'goal', team: 'us', message: 'Marley to Nate', timestamp: edt(23, '2:11:27 PM') },
      { type: 'note', message: 'Jed block', timestamp: edt(23, '2:13:54 PM') },
      { type: 'note', message: 'Mason block', timestamp: edt(23, '2:15:10 PM') },
      { type: 'goal', team: 'us', message: 'Nico to Mason', defensivePlay: 'block', timestamp: edt(23, '2:15:55 PM') },
      { type: 'note', message: 'Foster steal', timestamp: edt(23, '2:18:15 PM') },
      { type: 'goal', team: 'us', message: 'Cyrus to Foster ftw', defensivePlay: 'steal', timestamp: edt(23, '2:19:11 PM') },
      { type: 'game_end', message: 'Tech win 15-5', timestamp: edt(23, '2:23:57 PM') },
    ],
  },

  // ---------------- Game 3: vs Bard — W 13-8 (5/24) ----------------
  {
    chatId: 'states-bard-2026-05-24',
    opponentName: 'Bard',
    gameDate: '2026-05-24',
    gameOrder: 3,
    events: [
      { type: 'game_start', startingOnOffense: false, timestamp: edt(24, '8:56:24 AM') },
      { type: 'note', message: 'Jake block', timestamp: edt(24, '9:03:11 AM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(24, '9:03:35 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Jake', defensivePlay: 'steal', timestamp: edt(24, '9:03:40 AM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(24, '9:05:52 AM') },
      { type: 'goal', team: 'us', message: 'Nico to Jake w the toe drag', defensivePlay: 'steal', timestamp: edt(24, '9:06:02 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Nate', timestamp: edt(24, '9:09:12 AM') },
      { type: 'note', message: 'Jed block', timestamp: edt(24, '9:11:36 AM') },
      { type: 'goal', team: 'us', message: 'Nico to Asher', defensivePlay: 'block', timestamp: edt(24, '9:11:44 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout Bard', timestamp: edt(24, '9:12:35 AM') },
      { type: 'goal', team: 'them', message: '4-1', timestamp: edt(24, '9:15:59 AM') },
      { type: 'goal', team: 'them', message: '4-2', timestamp: edt(24, '9:20:36 AM') },
      { type: 'goal', team: 'us', message: 'Marley to Ellis', timestamp: edt(24, '9:23:06 AM') },
      { type: 'goal', team: 'them', message: '5-3', timestamp: edt(24, '9:25:44 AM') },
      { type: 'goal', team: 'them', message: '5-4', timestamp: edt(24, '9:28:49 AM') },
      { type: 'goal', team: 'them', message: '5-5', timestamp: edt(24, '9:31:43 AM') },
      { type: 'goal', team: 'us', message: 'Nico to Jake', timestamp: edt(24, '9:34:37 AM') },
      { type: 'note', message: 'Jed steal', timestamp: edt(24, '9:37:29 AM') },
      { type: 'goal', team: 'us', message: 'Nico to Jake', defensivePlay: 'steal', timestamp: edt(24, '9:37:55 AM') },
      { type: 'note', message: 'Ellis block', timestamp: edt(24, '9:40:13 AM') },
      { type: 'goal', team: 'us', message: 'Nico to Ellis', defensivePlay: 'block', timestamp: edt(24, '9:42:18 AM') },
      { type: 'halftime', timestamp: edt(24, '9:42:25 AM') },
      { type: 'second_half_start', timestamp: edt(24, '9:50:00 AM') },
      { type: 'note', message: 'Cyrus steal', timestamp: edt(24, '9:52:05 AM') },
      { type: 'goal', team: 'us', message: 'Marley to Foster', defensivePlay: 'steal', timestamp: edt(24, '9:52:58 AM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(24, '9:58:07 AM') },
      { type: 'note', message: 'Jake block', timestamp: edt(24, '10:01:07 AM') },
      { type: 'note', message: 'Max block', timestamp: edt(24, '10:02:05 AM') },
      { type: 'goal', team: 'us', message: 'Nico to Jake', defensivePlay: 'block', timestamp: edt(24, '10:03:00 AM') },
      { type: 'goal', team: 'them', message: '10-6', timestamp: edt(24, '10:08:17 AM') },
      { type: 'goal', team: 'them', message: '10-7', timestamp: edt(24, '10:10:55 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout', timestamp: edt(24, '10:12:06 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Corbin', timestamp: edt(24, '10:15:11 AM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(24, '10:17:30 AM') },
      { type: 'note', message: 'Mason diving block', timestamp: edt(24, '10:18:44 AM') },
      { type: 'goal', team: 'them', message: '11-8', timestamp: edt(24, '10:20:03 AM') },
      { type: 'note', message: 'Corbin block', timestamp: edt(24, '10:23:18 AM') },
      { type: 'timeout', team: 'us', message: 'Timeout Tech', timestamp: edt(24, '10:24:46 AM') },
      { type: 'goal', team: 'us', message: 'Jake to Nate', defensivePlay: 'block', timestamp: edt(24, '10:29:45 AM') },
      { type: 'note', message: 'Mason block', timestamp: edt(24, '10:33:00 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Nico ftw', defensivePlay: 'block', timestamp: edt(24, '10:33:11 AM') },
      { type: 'game_end', message: 'Tech win 13-8', timestamp: edt(24, '10:33:53 AM') },
    ],
  },

  // ---------------- Game 4: vs Scarsdale — W 11-9 (5/24) ----------------
  {
    chatId: 'states-scarsdale-2026-05-24',
    opponentName: 'Scarsdale',
    gameDate: '2026-05-24',
    gameOrder: 4,
    events: [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(24, '11:10:29 AM') },
      { type: 'note', message: 'Nico block', timestamp: edt(24, '11:12:40 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Nate', timestamp: edt(24, '11:13:53 AM') },
      { type: 'note', message: 'Mason block', timestamp: edt(24, '11:16:29 AM') },
      { type: 'goal', team: 'us', message: 'Mason to Teyo', defensivePlay: 'block', timestamp: edt(24, '11:18:36 AM') },
      { type: 'goal', team: 'them', message: '2-1', timestamp: edt(24, '11:22:26 AM') },
      { type: 'note', message: 'Ellis steal', timestamp: edt(24, '11:27:20 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Nate', defensivePlay: 'steal', timestamp: edt(24, '11:28:51 AM') },
      { type: 'timeout', team: 'them', message: 'Timeout', timestamp: edt(24, '11:30:23 AM') },
      { type: 'goal', team: 'them', message: '3-2', timestamp: edt(24, '11:32:37 AM') },
      { type: 'note', message: 'Gus block', timestamp: edt(24, '11:39:09 AM') },
      { type: 'note', message: 'Foster block', timestamp: edt(24, '11:40:51 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Mason', defensivePlay: 'block', timestamp: edt(24, '11:41:04 AM') },
      { type: 'goal', team: 'them', message: '4-3', timestamp: edt(24, '11:44:59 AM') },
      { type: 'goal', team: 'us', message: 'Marley to Corbin', timestamp: edt(24, '11:50:16 AM') },
      { type: 'goal', team: 'them', message: '5-4', timestamp: edt(24, '11:53:06 AM') },
      { type: 'goal', team: 'them', message: '5-5', timestamp: edt(24, '11:55:57 AM') },
      { type: 'goal', team: 'us', message: 'Ellis to Corbin', timestamp: edt(24, '12:00:09 PM') },
      { type: 'note', message: 'Jed block', timestamp: edt(24, '12:02:24 PM') },
      { type: 'note', message: 'Mason steal', timestamp: edt(24, '12:02:57 PM') },
      { type: 'goal', team: 'them', message: '6-6', timestamp: edt(24, '12:03:34 PM') },
      { type: 'goal', team: 'them', message: '6-7', timestamp: edt(24, '12:06:18 PM') },
      { type: 'timeout', team: 'them', message: 'Timeout', timestamp: edt(24, '12:07:13 PM') },
      { type: 'goal', team: 'them', message: '6-8', timestamp: edt(24, '12:11:48 PM') },
      { type: 'halftime', timestamp: edt(24, '12:11:52 PM') },
      { type: 'second_half_start', timestamp: edt(24, '12:18:00 PM') },
      { type: 'goal', team: 'us', message: 'Jake to Foster', timestamp: edt(24, '12:19:13 PM') },
      { type: 'note', message: 'Jake steal', timestamp: edt(24, '12:21:36 PM') },
      { type: 'note', message: 'Nico block', timestamp: edt(24, '12:22:11 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Corbin', defensivePlay: 'block', timestamp: edt(24, '12:22:22 PM') },
      { type: 'note', message: 'Jake steal', timestamp: edt(24, '12:24:32 PM') },
      { type: 'goal', team: 'them', message: '8-9', timestamp: edt(24, '12:25:24 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Corbin', timestamp: edt(24, '12:28:16 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Gus', timestamp: edt(24, '12:37:47 PM') },
      { type: 'goal', team: 'us', message: 'Ellis to Foster ftw', timestamp: edt(24, '12:41:13 PM') },
      { type: 'game_end', message: 'Tech win 11-9', timestamp: edt(24, '12:41:16 PM') },
    ],
  },

  // ---------------- Game 5: vs Bethlehem (FINAL) — W 15-5 (5/24) ----------------
  {
    chatId: 'states-bethlehem-2026-05-24',
    opponentName: 'Bethlehem',
    gameDate: '2026-05-24',
    gameOrder: 5,
    events: [
      { type: 'game_start', startingOnOffense: true, timestamp: edt(24, '1:04:19 PM') },
      { type: 'goal', team: 'us', message: 'Mason deep to Nate', timestamp: edt(24, '1:11:57 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Nico', timestamp: edt(24, '1:14:40 PM') },
      { type: 'goal', team: 'us', message: 'Cyrus to sliding Asher', timestamp: edt(24, '1:17:23 PM') },
      { type: 'goal', team: 'them', message: '3-1', timestamp: edt(24, '1:23:30 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Corbin', timestamp: edt(24, '1:25:59 PM') },
      { type: 'note', message: 'Gus block', timestamp: edt(24, '1:29:42 PM') },
      { type: 'note', message: 'Mason block', timestamp: edt(24, '1:31:28 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Teyo diving', defensivePlay: 'block', timestamp: edt(24, '1:33:56 PM') },
      { type: 'timeout', team: 'them', message: 'Timeout', timestamp: edt(24, '1:34:43 PM') },
      { type: 'note', message: 'Nico steal', timestamp: edt(24, '1:38:05 PM') },
      { type: 'note', message: 'Max block', timestamp: edt(24, '1:41:18 PM') },
      { type: 'goal', team: 'us', message: 'Mason to Max', defensivePlay: 'block', timestamp: edt(24, '1:41:21 PM') },
      { type: 'goal', team: 'us', message: 'Gus to Nate', timestamp: edt(24, '1:44:11 PM') },
      { type: 'goal', team: 'us', message: 'Nico to Asher', timestamp: edt(24, '1:46:25 PM') },
      { type: 'halftime', timestamp: edt(24, '1:47:02 PM') },
      { type: 'second_half_start', timestamp: edt(24, '1:54:00 PM') },
      { type: 'goal', team: 'them', message: '8-2', timestamp: edt(24, '1:54:52 PM') },
      { type: 'goal', team: 'us', message: 'Mason huck to leaping Gus', timestamp: edt(24, '1:57:07 PM') },
      { type: 'note', message: 'Asher block', timestamp: edt(24, '1:59:28 PM') },
      { type: 'goal', team: 'them', message: '9-3', timestamp: edt(24, '1:59:58 PM') },
      { type: 'goal', team: 'us', message: 'Nico to Gus', timestamp: edt(24, '2:02:39 PM') },
      { type: 'goal', team: 'us', message: 'Jed to Noah', timestamp: edt(24, '2:05:24 PM') },
      { type: 'goal', team: 'us', message: 'Nico to Cyrus (senior line)', timestamp: edt(24, '2:08:24 PM') },
      { type: 'note', message: 'Cyrus diving block', timestamp: edt(24, '2:10:52 PM') },
      { type: 'goal', team: 'us', message: 'Cyrus to Noah', defensivePlay: 'block', timestamp: edt(24, '2:16:47 PM') },
      { type: 'note', message: 'Asher block', timestamp: edt(24, '2:19:27 PM') },
      { type: 'goal', team: 'us', message: 'Nate to Foster', defensivePlay: 'block', timestamp: edt(24, '2:20:41 PM') },
      { type: 'goal', team: 'them', message: '14-4', timestamp: edt(24, '2:23:19 PM') },
      { type: 'goal', team: 'them', message: '14-5', timestamp: edt(24, '2:25:39 PM') },
      { type: 'goal', team: 'us', message: 'Jake to Nate ftw — REPEAT CHAMPS', timestamp: edt(24, '2:27:48 PM') },
      { type: 'game_end', message: 'Tech win 15-5 — NY State Champions!', timestamp: edt(24, '2:27:52 PM') },
    ],
  },
];

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

async function loadGame(g: Game) {
  console.log(`\n📊 Creating game: Tech Support vs ${g.opponentName} (${g.gameDate})`);
  const createRes = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: g.chatId,
      ourTeamName: 'Tech Support',
      opponentName: g.opponentName,
      tournamentName: 'NY State Championships',
      gameDate: g.gameDate,
      gameOrder: g.gameOrder,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create game: ${createRes.status} ${await createRes.text()}`);
  }

  const { game } = await createRes.json();
  console.log(`✅ Game created: ${game.id}`);

  for (let i = 0; i < g.events.length; i++) {
    const event = g.events[i];
    console.log(`  [${i + 1}/${g.events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(game.id, event);
  }
}

async function main() {
  console.log(`Using API: ${API_URL}`);
  for (const g of games) {
    try {
      await loadGame(g);
    } catch (err) {
      console.error(`❌ Error loading game vs ${g.opponentName}:`, err);
    }
  }
  console.log('\n🏆 All States games loaded. Repeat champs!');
}

main().catch(console.error);
