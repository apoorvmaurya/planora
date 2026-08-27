import { tool } from 'ai'
import { z } from 'zod'
import { getCoordinatesForLocation } from '@/lib/locationiq/geocode'
import { reorderDayItems, cleanseAndValidateItineraryItem } from '@/lib/itinerary/sort'
import { createBulkUpdateTool } from '@/lib/ai/bulkUpdateTool'

interface PlanChatContext {
  supabase: any
  planId: string
  user: { id: string }
  isAdmin: boolean
  plan: any
}

export function createPlanChatTools({ supabase, planId, user, isAdmin, plan }: PlanChatContext) {
  return {
    add_item: tool({
      description:
        'Add a new itinerary item to the plan. Stays/Hotels must always be placed in the Night slot as the final item of the day. Transit items belong at the start of travel segments. Check geographical and duration constraints before calling this.',
      inputSchema: z.object({
        day_number: z.number().describe('Which day of the trip (1-based)'),
        time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
        title: z.string().describe('Short title for the activity'),
        description: z.string().describe('Detailed description'),
        location_name: z.string().describe('Name of the venue/location'),
        category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
        duration_minutes: z.number().describe('Estimated duration in minutes'),
        estimated_cost: z.number().describe('Estimated cost in plan currency'),
      }),
      execute: async (p: {
        day_number: number
        time_of_day: 'Morning' | 'Afternoon' | 'Evening' | 'Night'
        title: string
        description: string
        location_name: string
        category: 'activity' | 'food' | 'transport' | 'accommodation' | 'leisure'
        duration_minutes: number
        estimated_cost: number
      }) => {
        cleanseAndValidateItineraryItem(p)

        const { data: existingItems } = await supabase
          .from('itinerary_items')
          .select('title, location_name')
          .eq('plan_id', planId)
          .eq('day_number', p.day_number)

        const clean = (s: string) =>
          s
            .toLowerCase()
            .replace(
              /^(explore|exploring|visit|visiting|go to|check in to|check-in to|arrival at|arrival and)\s+/,
              ''
            )
            .replace(/[^a-z0-9]/g, '')
            .trim()
        const coreNew = clean(p.title)

        const isDuplicate = existingItems?.some((item: any) => {
          const coreExisting = clean(item.title)
          if (coreNew === coreExisting && coreNew.length > 2) return true

          const cleanLocNew = p.location_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          const cleanLocExisting = item.location_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (cleanLocNew === cleanLocExisting && cleanLocNew.length > 2) {
            if (coreNew.includes(coreExisting) || coreExisting.includes(coreNew)) return true
          }
          return false
        })

        if (isDuplicate) {
          return {
            success: false,
            error: `The activity "${p.title}" is already scheduled on Day ${p.day_number}. Duplicate activities are not allowed.`,
          }
        }

        const { lat, lng } = await getCoordinatesForLocation(
          p.location_name,
          plan?.destination_name
        )

        const { data, error } = await supabase
          .from('itinerary_items')
          .insert({
            plan_id: planId,
            ...p,
            lat,
            lng,
            sort_order: 99,
            suggestion_status: isAdmin || !plan?.group_id ? 'approved' : 'suggestion',
            created_by: user.id,
          })
          .select()
          .single()
        if (error) return { success: false, error: error.message }

        await reorderDayItems(supabase, planId, p.day_number)

        const { data: reordered } = await supabase
          .from('itinerary_items')
          .select('*')
          .eq('id', data.id)
          .single()

        return { success: true, item: reordered || data }
      },
    }),

    edit_item: tool({
      description: 'Edit an existing itinerary item. Only include fields that need to change.',
      inputSchema: z.object({
        item_id: z.string().describe('The ID of the item to edit'),
        title: z.string().optional(),
        description: z.string().optional(),
        time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']).optional(),
        location_name: z.string().optional(),
        duration_minutes: z.number().optional(),
        estimated_cost: z.number().optional(),
      }),
      execute: async ({
        item_id,
        ...updates
      }: {
        item_id: string
        title?: string
        description?: string
        time_of_day?: 'Morning' | 'Afternoon' | 'Evening' | 'Night'
        location_name?: string
        duration_minutes?: number
        estimated_cost?: number
      }) => {
        const { data: existing } = await supabase
          .from('itinerary_items')
          .select('*')
          .eq('id', item_id)
          .single()
        if (!existing) return { success: false, error: 'Item not found' }

        const merged = { ...existing, ...updates }
        cleanseAndValidateItineraryItem(merged)
        if (updates.time_of_day) {
          updates.time_of_day = merged.time_of_day
        }

        let lat = existing.lat
        let lng = existing.lng

        if (updates.location_name && updates.location_name !== existing.location_name) {
          const coords = await getCoordinatesForLocation(
            updates.location_name,
            plan?.destination_name
          )
          lat = coords.lat
          lng = coords.lng
        }

        const isDirectEdit =
          isAdmin ||
          !plan?.group_id ||
          (existing.suggestion_status === 'suggestion' && existing.created_by === user.id)

        if (isDirectEdit) {
          const history = (existing.history as Array<Record<string, unknown>>) || []
          history.push({ ...existing, saved_at: new Date().toISOString(), saved_by: 'planora_ai' })

          const { data, error } = await supabase
            .from('itinerary_items')
            .update({ ...updates, lat, lng, history })
            .eq('id', item_id)
            .select()
            .single()
          if (error) return { success: false, error: error.message }

          await reorderDayItems(supabase, planId, existing.day_number)

          const { data: reordered } = await supabase
            .from('itinerary_items')
            .select('*')
            .eq('id', item_id)
            .single()

          return { success: true, item: reordered || data }
        } else {
          const { data, error } = await supabase
            .from('itinerary_items')
            .insert({
              plan_id: planId,
              day_number: existing.day_number,
              time_of_day:
                updates.time_of_day !== undefined ? updates.time_of_day : existing.time_of_day,
              title: updates.title !== undefined ? updates.title : existing.title,
              description:
                updates.description !== undefined ? updates.description : existing.description,
              location_name:
                updates.location_name !== undefined
                  ? updates.location_name
                  : existing.location_name,
              lat,
              lng,
              category: existing.category,
              duration_minutes:
                updates.duration_minutes !== undefined
                  ? updates.duration_minutes
                  : existing.duration_minutes,
              estimated_cost:
                updates.estimated_cost !== undefined
                  ? updates.estimated_cost
                  : existing.estimated_cost,
              sort_order: existing.sort_order,
              suggestion_status: 'suggestion',
              parent_item_id: item_id,
              created_by: user.id,
            })
            .select()
            .single()
          if (error) return { success: false, error: error.message }

          await reorderDayItems(supabase, planId, existing.day_number)

          const { data: reordered } = await supabase
            .from('itinerary_items')
            .select('*')
            .eq('id', data.id)
            .single()

          return { success: true, item: reordered || data, proposed: true }
        }
      },
    }),

    delete_item: tool({
      description: 'Remove an itinerary item from the plan.',
      inputSchema: z.object({
        item_id: z.string().describe('The ID of the item to delete'),
      }),
      execute: async ({ item_id }: { item_id: string }) => {
        const { data: existing } = await supabase
          .from('itinerary_items')
          .select('*')
          .eq('id', item_id)
          .single()
        if (!existing) return { success: false, error: 'Item not found' }

        const isDirectDelete =
          isAdmin ||
          !plan?.group_id ||
          (existing.suggestion_status === 'suggestion' && existing.created_by === user.id)

        if (isDirectDelete) {
          const { error } = await supabase.from('itinerary_items').delete().eq('id', item_id)
          if (error) return { success: false, error: error.message }

          await reorderDayItems(supabase, planId, existing.day_number)
          return { success: true, deleted: existing }
        } else {
          const { data, error } = await supabase
            .from('itinerary_items')
            .insert({
              plan_id: planId,
              day_number: existing.day_number,
              time_of_day: existing.time_of_day,
              title: `[Delete Proposal] ${existing.title}`,
              description: `Proposal to remove this activity from the itinerary.`,
              location_name: existing.location_name,
              lat: existing.lat,
              lng: existing.lng,
              category: existing.category,
              duration_minutes: existing.duration_minutes,
              estimated_cost: existing.estimated_cost,
              sort_order: existing.sort_order,
              suggestion_status: 'suggestion',
              parent_item_id: item_id,
              is_delete_suggestion: true,
              created_by: user.id,
            })
            .select()
            .single()
          if (error) return { success: false, error: error.message }

          await reorderDayItems(supabase, planId, existing.day_number)
          return { success: true, item: data, proposed: true }
        }
      },
    }),

    swap_items: tool({
      description: 'Swap the time slots of two itinerary items.',
      inputSchema: z.object({
        item_id_a: z.string().describe('First item ID'),
        item_id_b: z.string().describe('Second item ID'),
      }),
      execute: async ({
        item_id_a,
        item_id_b,
      }: {
        item_id_a: string
        item_id_b: string
      }) => {
        if (!isAdmin && plan?.group_id) {
          return { success: false, error: 'Only group admins can swap activity orders.' }
        }

        const { data: a } = await supabase
          .from('itinerary_items')
          .select('time_of_day, sort_order')
          .eq('id', item_id_a)
          .single()
        const { data: b } = await supabase
          .from('itinerary_items')
          .select('time_of_day, sort_order')
          .eq('id', item_id_b)
          .single()
        if (!a || !b) return { success: false, error: 'Items not found' }

        await supabase
          .from('itinerary_items')
          .update({ time_of_day: b.time_of_day, sort_order: b.sort_order })
          .eq('id', item_id_a)
        await supabase
          .from('itinerary_items')
          .update({ time_of_day: a.time_of_day, sort_order: a.sort_order })
          .eq('id', item_id_b)
        return { success: true }
      },
    }),

    bulk_update_itinerary: createBulkUpdateTool({ supabase, planId, user, isAdmin, plan }),
  }
}
