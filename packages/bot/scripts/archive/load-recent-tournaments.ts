/**
 * Script to load recent tournament games:
 * - Coconut Classic 2025 (Nov 1-2)
 * - Hucksgiving 2025 (Nov 22)
 * Run with: API_URL=https://api.score.kcuda.org npx tsx scripts/load-recent-tournaments.ts
 */

import { EventType } from '@scorebot/shared';

interface GameData {
  chatId: string;
  ourTeamName: string;
  opponentName: string;
  tournamentName: string;
  gameDate: string; // YYYY-MM-DD format
  gameOrder: number; // Order within tournament day
  startTime: string; // HH:MM format for actual game start time
  startingOnOffense: boolean;
  events: Array<{
    type: EventType;
    team?: 'us' | 'them';
    message: string;
    playerName?: string;
    assistName?: string;
    defensivePlay?: 'block' | 'steal';
  }>;
}

const API_URL = process.env.API_URL || 'http://localhost:8787';

// Recent tournament games
const games: GameData[] = [
  // Coconut Classic - November 1, 2025
  {
    chatId: 'coconut-nov1-game1',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Bethesda Chevy-Chase',
    tournamentName: 'Coconut Classic 2025',
    gameDate: '2025-11-01',
    gameOrder: 1,
    startTime: '11:00',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 1-0', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Cyrus to Anatole 2-0', playerName: 'Anatole', assistName: 'Cyrus' },
      { type: EventType.NOTE, team: 'us', message: 'Dock block', playerName: 'Dock', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'Dock block', playerName: 'Dock', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 3-0', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Alex block', playerName: 'Alex', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Alex tipped to Cyrus 4-0', playerName: 'Cyrus', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Dock 5-0', playerName: 'Dock', assistName: 'Nico' },
      { type: EventType.NOTE, team: 'us', message: 'Ben block', playerName: 'Ben', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Ben 6-0', playerName: 'Ben', assistName: 'Alex' },
      { type: EventType.NOTE, team: 'us', message: 'Jake block', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'Theo steal', playerName: 'Theo', defensivePlay: 'steal' },
      { type: EventType.NOTE, team: 'us', message: 'Nico steal', playerName: 'Nico', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 7-0', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Cyrus 8-0', playerName: 'Cyrus', assistName: 'Alex' },
      { type: EventType.NOTE, team: 'us', message: 'Asher block', playerName: 'Asher', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Jake 9-0', playerName: 'Jake', assistName: 'Nico' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis steal', playerName: 'Ellis', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Ellis 10-0', playerName: 'Ellis', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Anatole 11-0', playerName: 'Anatole', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'BCC scores 11-1' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Cyrus 12-1', playerName: 'Cyrus', assistName: 'Mason' },
      { type: EventType.NOTE, team: 'us', message: 'Asher block', playerName: 'Asher', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Corbin 13-1', playerName: 'Corbin', assistName: 'Jake' },
    ]
  },
  {
    chatId: 'coconut-nov1-game2',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Lower Merion',
    tournamentName: 'Coconut Classic 2025',
    gameDate: '2025-11-01',
    gameOrder: 2,
    startTime: '13:00',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 0-1' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to diving Cyrus 1-1', playerName: 'Cyrus', assistName: 'Nico' },
      { type: EventType.NOTE, team: 'us', message: 'Jake block', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jake 2-1', playerName: 'Jake', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion ties 2-2' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 3-2', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Cyrus block', playerName: 'Cyrus', defensivePlay: 'block' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Lower Merion' },
      { type: EventType.NOTE, team: 'us', message: 'Yoyo block', playerName: 'Yoyo', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 4-2', playerName: 'Mason', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 5-2', playerName: 'Mason', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 5-3' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Mason 6-3', playerName: 'Mason', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Dock block', playerName: 'Dock', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'Dock block', playerName: 'Dock', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Cyrus diving 7-3', playerName: 'Cyrus', assistName: 'Jake' },
      { type: EventType.HALFTIME, message: 'Halftime 7-3' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 7-4' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Corbin 8-4', playerName: 'Corbin', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 8-5' },
      { type: EventType.NOTE, team: 'us', message: 'Nico block', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 8-6' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Lower Merion' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Corbin 9-6', playerName: 'Corbin', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 9-7' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis block', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to diving Jake 10-7', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 10-8' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 10-9' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jake 11-9', playerName: 'Jake', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 11-10' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 12-10', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Lower Merion scores 12-11' },
      { type: EventType.NOTE, team: 'us', message: 'Corbin steal', playerName: 'Corbin', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Anatole 13-11', playerName: 'Anatole', assistName: 'Ellis' },
    ]
  },
  {
    chatId: 'coconut-nov1-game3',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Strathaven',
    tournamentName: 'Coconut Classic 2025',
    gameDate: '2025-11-01',
    gameOrder: 3,
    startTime: '14:59',
    startingOnOffense: false,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 1-0 Break', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jake 2-0', playerName: 'Jake', assistName: 'Mason' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Strathaven' },
      { type: EventType.NOTE, team: 'us', message: 'Mason block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Anatole 3-0', playerName: 'Anatole', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Nico 4-0', playerName: 'Nico', assistName: 'Alex' },
      { type: EventType.NOTE, team: 'us', message: 'NSL block', playerName: 'Noah SL', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'Mason block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'them', message: 'Strathaven scores 4-1' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 5-1', playerName: 'Mason', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Strathaven scores 5-2' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Alex 6-2', playerName: 'Alex', assistName: 'Mason' },
      { type: EventType.NOTE, team: 'us', message: 'Alex block', playerName: 'Alex', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'Nico block', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Asher 7-2', playerName: 'Asher', assistName: 'Alex' },
      { type: EventType.HALFTIME, message: 'Halftime 7-2' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 8-2', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'them', message: 'Strathaven scores 8-3' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Nico 9-3', playerName: 'Nico', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Strathaven scores 9-4' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to diving Alex 10-4', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Strathaven scores 10-5' },
      { type: EventType.GOAL, team: 'us', message: 'Jake hammer to Dock 11-5', playerName: 'Dock', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Strathaven scores 11-6' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Dock 12-6', playerName: 'Dock', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Strathaven scores 12-7' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 13-7', playerName: 'Mason', assistName: 'Jake' },
    ]
  },

  // Coconut Classic - November 2, 2025
  {
    chatId: 'coconut-nov2-game1',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Jackson-Reed',
    tournamentName: 'Coconut Classic 2025',
    gameDate: '2025-11-02',
    gameOrder: 1,
    startTime: '09:30',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed scores 0-1' },
      { type: EventType.NOTE, team: 'us', message: 'Cyrus steal', playerName: 'Cyrus', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jed 1-1', playerName: 'Jed', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed scores 1-2' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 2-2', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed scores 2-3' },
      { type: EventType.NOTE, team: 'us', message: 'Mason block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 3-3', playerName: 'Mason', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed scores 3-4' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Jackson-Reed' },
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed scores 3-5' },
      { type: EventType.GOAL, team: 'us', message: 'Mason hammer to Jed 4-5', playerName: 'Jed', assistName: 'Mason' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis block', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Anatole 5-5', playerName: 'Anatole', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake block in end zone', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Mason hammer to Cyrus 6-5', playerName: 'Cyrus', assistName: 'Mason' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Jackson-Reed' },
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed ties 6-6' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 7-6', playerName: 'Mason', assistName: 'Jake' },
      { type: EventType.HALFTIME, message: 'Halftime 7-6' },
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed ties 7-7' },
      { type: EventType.GOAL, team: 'us', message: 'Cyrus to Ellis 8-7', playerName: 'Ellis', assistName: 'Cyrus' },
      { type: EventType.GOAL, team: 'them', message: 'Jackson-Reed ties 8-8' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Ellis 9-8', playerName: 'Ellis', assistName: 'Alex' },
      { type: EventType.NOTE, team: 'us', message: 'Toby block', playerName: 'Toby', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Anatole 10-8', playerName: 'Anatole', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Cyrus steal', playerName: 'Cyrus', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Toby 11-8', playerName: 'Toby', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Anatole 12-8', playerName: 'Anatole', assistName: 'Ellis' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Jackson-Reed' },
      { type: EventType.NOTE, team: 'us', message: 'Mason block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 13-8', playerName: 'Mason', assistName: 'Jake' },
    ]
  },
  {
    chatId: 'coconut-nov2-game2',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Columbia',
    tournamentName: 'Coconut Classic 2025',
    gameDate: '2025-11-02',
    gameOrder: 2,
    startTime: '11:30',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 1-0', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 1-1' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Dock 2-1', playerName: 'Dock', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 2-2' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 3-2', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 3-3' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia takes lead 3-4' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Nico 4-4', playerName: 'Nico', assistName: 'Mason' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia takes lead 4-5' },
      { type: EventType.NOTE, team: 'us', message: 'Toby block', playerName: 'Toby', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 5-5', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Nico block', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'Jake block', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia takes lead 5-6' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Columbia' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jake 6-6', playerName: 'Jake', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia takes lead 6-7' },
      { type: EventType.HALFTIME, message: 'Halftime 6-7' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia extends lead 6-8' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia extends lead 6-9' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis block', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 7-9', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Mason 8-9', playerName: 'Mason', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia extends lead 8-10' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 9-10', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Toby block', playerName: 'Toby', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia extends lead 9-11' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis block', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia extends lead 9-12' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Columbia' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jake 10-12', playerName: 'Jake', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia wins 10-13' },
    ]
  },

  // Hucksgiving - November 22, 2025
  {
    chatId: 'hucksgiving-nov22-game1',
    ourTeamName: 'Brooklyn Tech B',
    opponentName: 'Brooklyn Magic',
    tournamentName: 'Hucksgiving 2025',
    gameDate: '2025-11-22',
    gameOrder: 1,
    startTime: '09:04',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 1-0', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'D Marley', playerName: 'Marley', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Cyrus to Marley 2-0', playerName: 'Marley', assistName: 'Cyrus' },
      { type: EventType.GOAL, team: 'them', message: 'Brooklyn Magic scores 2-1' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Ellis 3-1', playerName: 'Ellis', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Alex 4-1', playerName: 'Alex', assistName: 'Nico' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis D', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 5-1', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Nico 6-1', playerName: 'Nico', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Marley to Jake 7-1', playerName: 'Jake', assistName: 'Marley' },
      { type: EventType.NOTE, team: 'us', message: 'Alex steal', playerName: 'Alex', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Cyrus 8-1', playerName: 'Cyrus', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'them', message: 'Brooklyn Magic scores 8-2' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Marley 9-2', playerName: 'Marley', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Toby to Marley 10-2', playerName: 'Marley', assistName: 'Toby' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Noah 11-2', playerName: 'Noah', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 12-2', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'us', message: 'Jed to Alex 13-2', playerName: 'Alex', assistName: 'Jed' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Theo 14-2', playerName: 'Theo', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Cyrus 15-2', playerName: 'Cyrus', assistName: 'Nico' },
    ]
  },
  {
    chatId: 'hucksgiving-nov22-game2',
    ourTeamName: 'Brooklyn Tech A',
    opponentName: 'Bard',
    tournamentName: 'Hucksgiving 2025',
    gameDate: '2025-11-22',
    gameOrder: 2,
    startTime: '11:00',
    startingOnOffense: false,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 1-0 Break', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Bard scores 1-1' },
      { type: EventType.GOAL, team: 'us', message: 'Max to Jed 2-1', playerName: 'Jed', assistName: 'Max' },
      { type: EventType.NOTE, team: 'us', message: 'D Ellis', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Jed 3-1', playerName: 'Jed', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Jed 4-1', playerName: 'Jed', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Max 5-1', playerName: 'Max', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Theo 6-1', playerName: 'Theo', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Bard scores 6-2' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 7-2', playerName: 'Jed', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'D Jake', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Jed 8-2', playerName: 'Jed', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'D Ellis', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'D Alex', playerName: 'Alex', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Bard scores 8-3' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Jake 9-3', playerName: 'Jake', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Max to Noah 10-3', playerName: 'Noah', assistName: 'Max' },
      { type: EventType.NOTE, team: 'us', message: 'D Jed', playerName: 'Jed', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Cyrus to Nico 11-3', playerName: 'Nico', assistName: 'Cyrus' },
      { type: EventType.GOAL, team: 'us', message: 'Jed to Nico 12-3', playerName: 'Nico', assistName: 'Jed' },
      { type: EventType.GOAL, team: 'them', message: 'Bard scores 12-4' },
      { type: EventType.GOAL, team: 'us', message: 'Noah to Alex 13-4', playerName: 'Alex', assistName: 'Noah' },
      { type: EventType.NOTE, team: 'us', message: 'End zone D Theo', playerName: 'Theo', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'D Nico', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Max to Noah 14-4', playerName: 'Noah', assistName: 'Max' },
      { type: EventType.NOTE, team: 'us', message: 'Max D', playerName: 'Max', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Jake 15-4', playerName: 'Jake', assistName: 'Alex' },
    ]
  },
  {
    chatId: 'hucksgiving-nov22-game3',
    ourTeamName: 'Brooklyn Tech A',
    opponentName: 'Mikey Grauer\'s Ringers',
    tournamentName: 'Hucksgiving 2025',
    gameDate: '2025-11-22',
    gameOrder: 3,
    startTime: '13:04',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Nico to Alex 1-0', playerName: 'Alex', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent ties 1-1' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent takes lead 1-2' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Max 2-2', playerName: 'Max', assistName: 'Nico' },
      { type: EventType.NOTE, team: 'us', message: 'End zone steal Jake', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Cyrus to Jed 3-2', playerName: 'Jed', assistName: 'Cyrus' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent ties 3-3' },
      { type: EventType.GOAL, team: 'us', message: 'Marley to Nico 4-3', playerName: 'Nico', assistName: 'Marley' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent ties 4-4' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Jed 5-4', playerName: 'Jed', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent ties 5-5' },
      { type: EventType.NOTE, team: 'us', message: 'End zone block Nico', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Alex 6-5', playerName: 'Alex', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'D Noah', playerName: 'Noah', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 7-5', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent scores 7-6' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent ties 7-7' },
      { type: EventType.NOTE, team: 'us', message: 'End zone D Jake', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Theo 8-7', playerName: 'Theo', assistName: 'Alex' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent ties 8-8' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Theo 9-8', playerName: 'Theo', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent ties 9-9' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent takes lead 9-10' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 10-10', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent takes lead 10-11' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 11-11', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Opponent takes lead 11-12' },
      { type: EventType.GOAL, team: 'us', message: 'Tech ties 12-12', playerName: 'Unknown' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Jake to Jed 13-12 GAME', playerName: 'Jed', assistName: 'Jake' },
    ]
  },
];

async function createGame(gameData: GameData): Promise<string> {
  console.log(`\nCreating game: ${gameData.ourTeamName} vs ${gameData.opponentName} (${gameData.tournamentName})`);

  const createResponse = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: gameData.chatId,
      ourTeamName: gameData.ourTeamName,
      opponentName: gameData.opponentName,
      tournamentName: gameData.tournamentName,
      gameDate: gameData.gameDate,
      gameOrder: gameData.gameOrder,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create game: ${await createResponse.text()}`);
  }

  const { game } = await createResponse.json();
  const gameId = game.id;
  console.log(`✓ Created game ${gameId}`);

  // Start the game with starting offense/defense info
  console.log(`  Starting game (starting on ${gameData.startingOnOffense ? 'O' : 'D'})...`);
  const startResponse = await fetch(`${API_URL}/games/${gameId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: EventType.GAME_START,
      message: `Game start - Tech starting on ${gameData.startingOnOffense ? 'offense' : 'defense'}`,
      startingOnOffense: gameData.startingOnOffense,
    }),
  });

  if (!startResponse.ok) {
    throw new Error(`Failed to start game: ${await startResponse.text()}`);
  }

  // Add events
  console.log(`  Adding ${gameData.events.length} events...`);
  for (let i = 0; i < gameData.events.length; i++) {
    const event = gameData.events[i];

    const eventResponse = await fetch(`${API_URL}/games/${gameId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!eventResponse.ok) {
      console.error(`Failed to add event ${i + 1}: ${event.message}`);
      throw new Error(`Failed to add event: ${await eventResponse.text()}`);
    }

    // Show progress every 5 events
    if ((i + 1) % 5 === 0 || i === gameData.events.length - 1) {
      console.log(`    ${i + 1}/${gameData.events.length} events added`);
    }
  }

  // End the game
  console.log(`  Ending game...`);
  const endResponse = await fetch(`${API_URL}/games/${gameId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: EventType.GAME_END,
      message: 'Game complete',
    }),
  });

  if (!endResponse.ok) {
    throw new Error(`Failed to end game: ${await endResponse.text()}`);
  }

  console.log(`✅ Game completed: ${gameId}`);
  return gameId;
}

async function loadAllGames() {
  console.log('🚀 Starting to load recent tournament games...\n');
  console.log(`Total games to load: ${games.length}`);
  console.log(`API URL: ${API_URL}\n`);

  const gameIds: string[] = [];

  for (const gameData of games) {
    try {
      const gameId = await createGame(gameData);
      gameIds.push(gameId);
    } catch (error) {
      console.error(`\n❌ Error loading game:`, error);
      throw error;
    }
  }

  console.log('\n✅ All games loaded successfully!');
  console.log('\nGame IDs:');
  gameIds.forEach((id, index) => {
    console.log(`  ${index + 1}. ${games[index].tournamentName} - ${games[index].gameDate}: ${id}`);
  });

  console.log(`\n🌐 View games at: https://score.kcuda.org`);
}

loadAllGames().catch(console.error);
