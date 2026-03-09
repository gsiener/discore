/**
 * Timeline rendering for game events
 * Displays events in reverse chronological order with WFDF-style layout
 */

import type { Game, GameEvent } from '@scorebot/shared';
import { EventType, formatTime } from '@scorebot/shared';
import { getEventIcon, formatEventType } from './eventFormatter.js';

export function renderTimeline(game: Game): void {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;

  const events = game.events;

  if (events.length === 0) {
    timeline.innerHTML = '<p class="empty-state">No events yet</p>';
    return;
  }

  timeline.innerHTML = '';

  // Filter out game end events and render in reverse order (most recent first)
  const filteredEvents = events.filter(e => e.type !== EventType.GAME_END);
  const reversedEvents = [...filteredEvents].reverse();
  reversedEvents.forEach((event) => {
    const eventEl = createEventElement(event, game, events);
    timeline.appendChild(eventEl);
  });
}

function createEventElement(event: GameEvent, game: Game, allEvents: GameEvent[]): HTMLElement {
  const div = document.createElement('div');
  div.className = 'timeline-event';

  if (event.type === EventType.GOAL && event.team) {
    div.classList.add(`goal-${event.team}`);
  }

  // Left side: event info
  const leftCol = document.createElement('div');
  leftCol.className = 'event-left';

  // Main event header (time + icon + event type on one line)
  const header = document.createElement('div');
  header.className = 'event-header';

  const time = document.createElement('span');
  time.className = 'event-time';
  time.textContent = formatTime(event.timestamp);

  const icon = document.createElement('span');
  icon.className = 'event-icon';
  icon.textContent = getEventIcon(event, allEvents, game);

  const type = document.createElement('span');
  type.className = 'event-type';
  type.textContent = formatEventType(event, game, allEvents);

  header.appendChild(time);
  header.appendChild(icon);
  header.appendChild(type);
  leftCol.appendChild(header);

  // Show starting team for GAME_START events
  if (event.type === EventType.GAME_START && game.startingOnOffense !== undefined) {
    const startingTeamEl = document.createElement('div');
    startingTeamEl.className = 'event-details';
    const teamName = game.startingOnOffense ? game.teams.us.name : game.teams.them.name;
    startingTeamEl.textContent = `${teamName} begins on offense`;
    leftCol.appendChild(startingTeamEl);
  }

  // Show message as subtext for NOTE events with defensive plays
  if (event.type === EventType.NOTE && event.defensivePlay && event.message) {
    const message = document.createElement('div');
    message.className = 'event-details';
    message.textContent = event.message;
    leftCol.appendChild(message);
  }
  // Show defensive play indicator for GOAL events
  else if (event.type === EventType.GOAL && event.defensivePlay && event.team === 'us') {
    const defensivePlayEl = document.createElement('div');
    defensivePlayEl.className = 'event-details defensive-play';
    defensivePlayEl.textContent = event.defensivePlay === 'block' ? '\uD83D\uDEE1\uFE0F Block' : '\uD83C\uDFC3 Steal';
    leftCol.appendChild(defensivePlayEl);
  }

  // Only show message for our team's goals (as secondary details)
  if (event.type === EventType.GOAL && event.message && event.team === 'us') {
    const message = document.createElement('div');
    message.className = 'event-details';
    message.textContent = event.message;
    leftCol.appendChild(message);
  }

  // Right side: score display
  const rightCol = document.createElement('div');
  rightCol.className = 'event-score-cell';

  const scoreUs = document.createElement('div');
  scoreUs.className = 'score-line score-us';
  scoreUs.innerHTML = `<span class="score-number">${event.score.us}</span> ${game.teams.us.name}`;

  const scoreThem = document.createElement('div');
  scoreThem.className = 'score-line score-them';
  scoreThem.innerHTML = `<span class="score-number">${event.score.them}</span> ${game.teams.them.name}`;

  rightCol.appendChild(scoreUs);
  rightCol.appendChild(scoreThem);

  div.appendChild(leftCol);
  div.appendChild(rightCol);

  return div;
}
