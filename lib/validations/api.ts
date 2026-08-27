import { z } from 'zod'

/**
 * Reusable Zod input validation schemas for Planora API routes.
 */

export const voteSchema = z.object({
  item_id: z.string().min(1, 'Item ID is required'),
  vote: z.enum(['up', 'down'], {
    errorMap: () => ({ message: "Vote must be either 'up' or 'down'" }),
  }),
})

export const transitAddSchema = z.object({
  from: z.string().min(1, 'Origin is required'),
  to: z.string().min(1, 'Destination is required'),
  mode: z.enum(['flight', 'train', 'bus', 'drive', 'transit']).default('transit'),
  duration: z.string().optional().default('N/A'),
  day_number: z.number().int().positive().default(1),
  estimated_cost: z.union([z.number(), z.string()]).optional().default(0),
  carrier: z.string().optional(),
})

export const itineraryItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  category: z
    .enum(['activity', 'food', 'transport', 'accommodation', 'leisure'])
    .default('activity'),
  time_of_day: z
    .enum(['Morning', 'Afternoon', 'Evening', 'Night', 'pre-trip'])
    .default('Morning'),
  location_name: z.string().optional().default(''),
  duration_minutes: z.number().int().nonnegative().optional().default(60),
  estimated_cost: z.number().nonnegative().optional().default(0),
  lat: z.number().optional().default(0),
  lng: z.number().optional().default(0),
  day_number: z.number().int().positive().default(1),
})

export const groupCreateSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(500).optional(),
})

export const groupJoinSchema = z.object({
  code: z.string().min(1, 'Invite code is required'),
})
