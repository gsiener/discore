/**
 * Script to load Fall 2025 tournament games:
 * - Fall Flock 2025 (Oct 11-12)
 * - Halloween Havoc 2025 (Oct 26)
 * - Coconut Classic 2025 (Nov 1-2)
 * - Hucksgiving 2025 (Nov 22)
 * Run with: node --loader ts-node/esm scripts/load-fall-tournaments.ts
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

// All tournament games with detailed events
const games: GameData[] = [
  // Fall Flock - October 11, 2025
  {
    chatId: 'fall-flock-oct11-game1',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Columbia JV',
    tournamentName: 'Fall Flock 2025',
    gameDate: '2025-10-11',
    gameOrder: 1,
    startTime: '09:29',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Jed to Cyrus 1-0', playerName: 'Cyrus', assistName: 'Jed' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Marley 2-0', playerName: 'Marley', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Jed 3-0', playerName: 'Jed', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Ben to Teyo 4-0', playerName: 'Teyo', assistName: 'Ben' },
      { type: EventType.GOAL, team: 'us', message: 'Noah D to Jed 5-0', playerName: 'Jed', assistName: 'Noah D' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 5-1' },
      { type: EventType.GOAL, team: 'us', message: 'Jed to Ellis 6-1', playerName: 'Ellis', assistName: 'Jed' },
      { type: EventType.GOAL, team: 'us', message: 'Corbin to Jake 7-1', playerName: 'Jake', assistName: 'Corbin' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 8-1', playerName: 'Jed', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal in endzone', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 9-1', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Alex steal', playerName: 'Alex', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Noah SL 10-1', playerName: 'Noah SL', assistName: 'Alex' },
      { type: EventType.NOTE, team: 'us', message: 'Corbin block', playerName: 'Corbin', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Marley to Corbin 11-1', playerName: 'Corbin', assistName: 'Marley' },
      { type: EventType.GOAL, team: 'us', message: 'Jed to Noah D 12-1', playerName: 'Noah D', assistName: 'Jed' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Nico 13-1 Game', playerName: 'Nico', assistName: 'Ellis' },
    ]
  },
  {
    chatId: 'fall-flock-oct11-game2',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Beacon',
    tournamentName: 'Fall Flock 2025',
    gameDate: '2025-10-11',
    gameOrder: 2,
    startTime: '11:34',
    startingOnOffense: false,
    events: [
      { type: EventType.NOTE, team: 'us', message: 'Cyrus D', playerName: 'Cyrus', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Marley to Jed 1-0', playerName: 'Jed', assistName: 'Marley' },
      { type: EventType.GOAL, team: 'them', message: 'Beacon scores 1-1' },
      { type: EventType.GOAL, team: 'us', message: 'Marley to Nico 2-1', playerName: 'Nico', assistName: 'Marley' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 3-1', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 4-1', playerName: 'Jed', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 5-1', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Cyrus 6-1', playerName: 'Cyrus', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake endzone steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Teyo 7-1', playerName: 'Teyo', assistName: 'Nico' },
      { type: EventType.HALFTIME, team: 'us', message: 'Halftime' },
      { type: EventType.NOTE, team: 'us', message: 'Alex block', playerName: 'Alex', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jed to Max 8-1', playerName: 'Max', assistName: 'Jed' },
      { type: EventType.NOTE, team: 'us', message: 'Marley foot block', playerName: 'Marley', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Marley 9-1', playerName: 'Marley', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 10-1', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Beacon scores 10-2' },
      { type: EventType.GOAL, team: 'us', message: 'Jed to Ellis 11-2', playerName: 'Ellis', assistName: 'Jed' },
      { type: EventType.NOTE, team: 'us', message: 'Ben D', playerName: 'Ben', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Noah D 12-2', playerName: 'Noah D', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Noah SL D', playerName: 'Noah SL', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 13-2 Game', playerName: 'Jed', assistName: 'Ellis' },
    ]
  },
  {
    chatId: 'fall-flock-oct11-game3',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Westfield',
    tournamentName: 'Fall Flock 2025',
    gameDate: '2025-10-11',
    gameOrder: 3,
    startTime: '14:04',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Jake to Alex 1-0', playerName: 'Alex', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 2-0', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Asher 3-0', playerName: 'Asher', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 4-0', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Westfield' },
      { type: EventType.GOAL, team: 'them', message: 'Westfield scores 4-1' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Jed 5-1', playerName: 'Jed', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 6-1', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis steal', playerName: 'Ellis', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Yoyo to Max 7-1', playerName: 'Max', assistName: 'Yoyo' },
      { type: EventType.GOAL, team: 'them', message: 'Westfield scores 7-2' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Cyrus 8-2', playerName: 'Cyrus', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Noah D 9-2', playerName: 'Noah D', assistName: 'Nico' },
      { type: EventType.NOTE, team: 'us', message: 'Ellis endzone D', playerName: 'Ellis', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jed to Alex 10-2', playerName: 'Alex', assistName: 'Jed' },
      { type: EventType.NOTE, team: 'us', message: 'Nico hand block', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Westfield scores 10-3' },
      { type: EventType.NOTE, team: 'us', message: 'Noah SL endzone D', playerName: 'Noah SL', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 11-3', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Marley 12-3', playerName: 'Marley', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 13-3 Game', playerName: 'Jed', assistName: 'Ellis' },
    ]
  },

  // Fall Flock - October 12, 2025
  {
    chatId: 'fall-flock-oct12-semifinal',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Montclair',
    tournamentName: 'Fall Flock 2025',
    gameDate: '2025-10-12',
    gameOrder: 1,
    startTime: '11:02',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Corbin to Cyrus 1-0', playerName: 'Cyrus', assistName: 'Corbin' },
      { type: EventType.NOTE, team: 'us', message: 'Corbin D', playerName: 'Corbin', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 2-0', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Marley slap down D', playerName: 'Marley', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 3-0', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 3-1' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 4-1', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 4-2' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Cyrus 5-2', playerName: 'Cyrus', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 5-3' },
      { type: EventType.GOAL, team: 'us', message: 'Corbin to Nico 6-3', playerName: 'Nico', assistName: 'Corbin' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 6-4' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 6-5' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair ties 6-6' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair takes lead 6-7' },
      { type: EventType.NOTE, team: 'us', message: 'Corbin D', playerName: 'Corbin', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 7-7', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 8-7', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Alex D', playerName: 'Alex', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 9-7', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Marley D', playerName: 'Marley', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 10-7', playerName: 'Jed', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Nico D', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 11-7', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake endzone D', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 11-8' },
      { type: EventType.GOAL, team: 'us', message: 'Marley to Jed 12-8 Game', playerName: 'Jed', assistName: 'Marley' },
    ]
  },
  {
    chatId: 'fall-flock-oct12-final',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Columbia',
    tournamentName: 'Fall Flock 2025',
    gameDate: '2025-10-12',
    gameOrder: 2,
    startTime: '13:47',
    startingOnOffense: false,
    events: [
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 0-1' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Corbin 1-1', playerName: 'Corbin', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 1-2' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 1-3' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 2-3', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Alex D', playerName: 'Alex', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 3-3', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 3-4' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 4-4', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 4-5' },
      { type: EventType.NOTE, team: 'us', message: 'Jake D', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.NOTE, team: 'us', message: 'Cyrus endzone steal', playerName: 'Cyrus', defensivePlay: 'steal' },
      { type: EventType.NOTE, team: 'us', message: 'Jake endzone steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.NOTE, team: 'us', message: 'Jed D', playerName: 'Jed', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 5-5', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Ellis 6-5 Break', playerName: 'Ellis', assistName: 'Alex' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 6-6' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 7-6', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 7-7' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Ellis 8-7', playerName: 'Ellis', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 8-8' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia takes lead 8-9' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Cyrus 9-9', playerName: 'Cyrus', assistName: 'Jake' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 9-10' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 9-11' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 10-11', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 10-12' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia wins 10-13' },
    ]
  },

  // Halloween Havoc - October 26, 2025
  {
    chatId: 'halloween-havoc-oct26-game1',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Bergen Ultimate',
    tournamentName: 'Halloween Havoc 2025',
    gameDate: '2025-10-26',
    gameOrder: 1,
    startTime: '09:29',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Dockery 1-0', playerName: 'Dockery', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake block', playerName: 'Jake', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Theo 2-0', playerName: 'Theo', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Bergen scores 2-1' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Jed 3-1', playerName: 'Jed', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Nico 4-1', playerName: 'Nico', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Mason hammer to Max 5-1', playerName: 'Max', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Alex 6-1', playerName: 'Alex', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Mason block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Cyrus 7-1', playerName: 'Cyrus', assistName: 'Jake' },
      { type: EventType.HALFTIME, team: 'us', message: 'Halftime' },
      { type: EventType.NOTE, team: 'us', message: 'Alex block at goal line', playerName: 'Alex', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Mason 8-1', playerName: 'Mason', assistName: 'Alex' },
      { type: EventType.NOTE, team: 'us', message: 'Nico steal', playerName: 'Nico', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Asher to Jake 9-1', playerName: 'Jake', assistName: 'Asher' },
      { type: EventType.GOAL, team: 'them', message: 'Bergen scores 9-2' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jake 10-2', playerName: 'Jake', assistName: 'Mason' },
      { type: EventType.NOTE, team: 'us', message: 'Nate steal', playerName: 'Nate', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'them', message: 'Bergen scores 10-3' },
      { type: EventType.GOAL, team: 'us', message: 'Max to Asher 11-3', playerName: 'Asher', assistName: 'Max' },
      { type: EventType.NOTE, team: 'us', message: 'Jed diving block', playerName: 'Jed', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Cyrus to Alex 12-3', playerName: 'Alex', assistName: 'Cyrus' },
      { type: EventType.GOAL, team: 'us', message: 'Asher to Ellis 13-3 Game', playerName: 'Ellis', assistName: 'Asher' },
    ]
  },
  {
    chatId: 'halloween-havoc-oct26-semifinal',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Montclair',
    tournamentName: 'Halloween Havoc 2025',
    gameDate: '2025-10-26',
    gameOrder: 2,
    startTime: '11:34',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Nate to Jake 1-0', playerName: 'Jake', assistName: 'Nate' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Ellis 2-0 Break', playerName: 'Ellis', assistName: 'Mason' },
      { type: EventType.NOTE, team: 'us', message: 'Cyrus block', playerName: 'Cyrus', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Nate 3-0', playerName: 'Nate', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 3-1' },
      { type: EventType.NOTE, team: 'us', message: 'Ben block', playerName: 'Ben', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Ellis 4-1', playerName: 'Ellis', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to diving Cyrus 5-1', playerName: 'Cyrus', assistName: 'Nico' },
      { type: EventType.GOAL, team: 'us', message: 'Nate to Mason 6-1', playerName: 'Mason', assistName: 'Nate' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 6-2' },
      { type: EventType.GOAL, team: 'us', message: 'Alex to Thaddeus 7-2', playerName: 'Thaddeus', assistName: 'Alex' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 7-3' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 7-4' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 7-5' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Nate 8-5', playerName: 'Nate', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 8-6' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 9-6', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 9-7' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Theo 10-7', playerName: 'Theo', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 10-8' },
      { type: EventType.GOAL, team: 'us', message: 'Nico to Noah 11-8', playerName: 'Noah', assistName: 'Nico' },
      { type: EventType.NOTE, team: 'us', message: 'Mason foot block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Ellis 12-8', playerName: 'Ellis', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Montclair scores 12-9' },
      { type: EventType.NOTE, team: 'us', message: 'Nico block', playerName: 'Nico', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Nico 13-9 Game', playerName: 'Nico', assistName: 'Ellis' },
    ]
  },
  {
    chatId: 'halloween-havoc-oct26-final',
    ourTeamName: 'Brooklyn Tech',
    opponentName: 'Columbia',
    tournamentName: 'Halloween Havoc 2025',
    gameDate: '2025-10-26',
    gameOrder: 3,
    startTime: '13:49',
    startingOnOffense: true,
    events: [
      { type: EventType.GOAL, team: 'us', message: 'Cyrus to Nico 1-0', playerName: 'Nico', assistName: 'Cyrus' },
      { type: EventType.NOTE, team: 'us', message: 'Mason block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Jake 2-0', playerName: 'Jake', assistName: 'Mason' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 2-1' },
      { type: EventType.GOAL, team: 'us', message: 'Nate to Jake 3-1', playerName: 'Jake', assistName: 'Nate' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 3-2' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 4-2', playerName: 'Jed', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 4-3' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Nico 5-3', playerName: 'Nico', assistName: 'Jake' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 5-4' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Noah 6-4', playerName: 'Noah', assistName: 'Ellis' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.NOTE, team: 'us', message: 'Mason steal', playerName: 'Mason', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'us', message: 'Mason to Nate 7-4', playerName: 'Nate', assistName: 'Mason' },
      { type: EventType.HALFTIME, team: 'us', message: 'Halftime' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 7-5' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 7-6' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jake 8-6', playerName: 'Jake', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 8-7' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 9-7', playerName: 'Jed', assistName: 'Ellis' },
      { type: EventType.NOTE, team: 'us', message: 'Jake sky steal', playerName: 'Jake', defensivePlay: 'steal' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 9-8' },
      { type: EventType.TIMEOUT, team: 'them', message: 'Timeout Columbia' },
      { type: EventType.TIMEOUT, team: 'us', message: 'Timeout Tech' },
      { type: EventType.GOAL, team: 'us', message: 'Theo to Max 10-8', playerName: 'Max', assistName: 'Theo' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia scores 10-9' },
      { type: EventType.NOTE, team: 'us', message: 'Mason block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 10-10' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Mason 11-10', playerName: 'Mason', assistName: 'Ellis' },
      { type: EventType.GOAL, team: 'them', message: 'Columbia ties 11-11' },
      { type: EventType.GOAL, team: 'us', message: 'Jake to Mason 12-11', playerName: 'Mason', assistName: 'Jake' },
      { type: EventType.NOTE, team: 'us', message: 'Mason foot block', playerName: 'Mason', defensivePlay: 'block' },
      { type: EventType.GOAL, team: 'us', message: 'Ellis to Jed 13-11 Break for the win', playerName: 'Jed', assistName: 'Ellis' },
    ]
  },

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
  console.log('🚀 Starting to load Fall tournament games...\n');
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

  console.log(`\n🌐 View games at: ${API_URL.replace('8787', '3000')}/games`);
}

loadAllGames().catch(console.error);
