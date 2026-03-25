/**
 * Shared utilities for game components
 */

import type { GameEvent } from '@scorebot/shared';
import { EventType } from '@scorebot/shared';

/**
 * Find the index of the last goal before halftime.
 * Returns -1 if no halftime event exists.
 */
export function findHalftimePointIndex(goalEvents: GameEvent[], allEvents: GameEvent[]): number {
  const halftimeEvent = allEvents.find(e => e.type === EventType.HALFTIME);
  if (!halftimeEvent) return -1;

  let index = -1;
  for (let i = 0; i < goalEvents.length; i++) {
    if (goalEvents[i].timestamp < halftimeEvent.timestamp) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
