/**
 * Break detection logic for ultimate frisbee scoring
 * Determines whether a goal is a "break" (scored while on defense)
 * or a "hold" (scored while on offense).
 */

import type { Game, GameEvent } from '@scorebot/shared';
import { EventType } from '@scorebot/shared';

export function isBreakScore(event: GameEvent, allEvents: GameEvent[], game: Game): boolean {
  // Find the previous goal event
  const eventIndex = allEvents.findIndex(e => e.id === event.id);

  // For the first goal, check if we have startingOnOffense info
  if (eventIndex === 0) {
    if (game.startingOnOffense !== undefined && event.team === 'us') {
      // If we started on offense and we scored first, it's a hold
      // If we started on defense and we scored first, it's a break
      return !game.startingOnOffense;
    }
    return false; // Can't determine without more info
  }

  // Look backwards for the previous goal, checking if halftime occurred in between
  let crossedHalftime = false;
  for (let i = eventIndex - 1; i >= 0; i--) {
    const prevEvent = allEvents[i];
    if (prevEvent.type === EventType.HALFTIME) {
      crossedHalftime = true;
    }
    if (prevEvent.type === EventType.GOAL && prevEvent.team) {
      // Same team scoring consecutively = break (they were on defense after pull)
      // But if halftime occurred, receiving team flips, so same team = hold
      const sameTeam = prevEvent.team === event.team;
      return crossedHalftime ? !sameTeam : sameTeam;
    }
  }

  return false;
}
