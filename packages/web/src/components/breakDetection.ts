/**
 * Break detection logic for ultimate frisbee scoring
 * Determines whether a goal is a "break" (scored while on defense)
 * or a "hold" (scored while on offense).
 */

import type { Game, GameEvent } from '@scorebot/shared';
import { EventType } from '@scorebot/shared';

export function isBreakScore(event: GameEvent, allEvents: GameEvent[], game: Game): boolean {
  const eventIndex = allEvents.findIndex(e => e.id === event.id);

  // Look backwards for the previous goal, checking if halftime occurred in between
  let crossedHalftime = false;
  for (let i = eventIndex - 1; i >= 0; i--) {
    const prevEvent = allEvents[i];
    if (prevEvent.type === EventType.HALFTIME) {
      crossedHalftime = true;
    }
    if (prevEvent.type === EventType.GOAL && prevEvent.team) {
      if (crossedHalftime && game.startingOnOffense !== undefined && event.team) {
        // After halftime, the team that received first now pulls (switches to D).
        // So break = scoring team is the one that started on O (now on D after half).
        return (event.team === 'us') === game.startingOnOffense;
      }
      // Same team scoring consecutively = break (they were on defense after pull)
      const sameTeam = prevEvent.team === event.team;
      return sameTeam;
    }
  }

  // No previous goal found — this is the first goal of the game
  if (game.startingOnOffense !== undefined && event.team) {
    const weOnOffense = crossedHalftime ? !game.startingOnOffense : game.startingOnOffense;
    return event.team === 'us' ? !weOnOffense : weOnOffense;
  }

  return false;
}
