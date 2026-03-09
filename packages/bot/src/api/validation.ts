/**
 * Zod schemas for API request validation
 */

import { z } from 'zod';
import { EventType, TeamSide } from '@scorebot/shared';

/**
 * Schema for POST /games - Create a new game
 */
export const CreateGameRequestSchema = z.object({
  chatId: z.string().min(1, 'chatId is required'),
  ourTeamName: z.string().min(1, 'ourTeamName is required'),
  opponentName: z.string().min(1, 'opponentName is required'),
  tournamentName: z.string().optional(),
  gameDate: z.string().optional(),
  gameOrder: z.number().int().positive().optional(),
});

/**
 * Schema for POST /games/:id/events - Add an event to a game
 */
export const AddEventRequestSchema = z.object({
  type: z.nativeEnum(EventType),
  team: z.nativeEnum(TeamSide).optional(),
  message: z.string().optional(),
  defensivePlay: z.enum(['block', 'steal']).optional(),
  startingOnOffense: z.boolean().optional(),
  timestamp: z.number().optional(),
  score: z
    .object({
      us: z.number().int().min(0),
      them: z.number().int().min(0),
    })
    .optional(),
});
