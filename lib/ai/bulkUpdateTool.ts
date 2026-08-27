import { tool } from 'ai'
import { z } from 'zod'
import { getCoordinatesForLocation } from '@/lib/locationiq/geocode'
import { cleanseAndValidateItineraryItem } from '@/lib/itinerary/sort'

interface BulkUpdateContext {
  supabase: any
  planId: string
  user: { id: string }
  isAdmin: boolean
  plan: any
}

export function createBulkUpdateTool({ supabase, planId, user, isAdmin, plan }: BulkUpdateContext) {
  return tool({
    description:
      'Perform bulk additions, deletions, or updates to the itinerary. Ensure all upserted items are ordered logically and follow geographical coherence.',
    inputSchema: z.object({
      delete_item_ids: z
        .array(z.string().uuid())
        .optional()
        .describe('List of itinerary item IDs to delete.'),
      upsert_items: z
        .array(
          z.object({
            id: z
              .string()
              .uuid()
              .optional()
              .describe(
                'If updating an existing item, specify its ID. If creating a new item, omit this field.'
              ),
            day_number: z.number().describe('Day of the trip (1-based)'),
            time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
            title: z.string().describe('Title of the activity'),
            description: z.string().describe('Detailed description'),
            location_name: z.string().describe('Location name'),
            category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
            duration_minutes: z.number().describe('Duration in minutes'),
            estimated_cost: z.number().describe('Estimated cost in plan currency'),
          })
        )
        .optional()
        .describe('List of new or updated itinerary items.'),
    }),
    execute: async (p: {
      delete_item_ids?: string[]
      upsert_items?: any[]
    }) => {
      let deleted_count = 0
      let upserted_count = 0
      const skipped_duplicates: string[] = []

      const { data: dbItems } = await supabase
        .from('itinerary_items')
        .select('id, title, location_name, day_number')
        .eq('plan_id', planId)

      const clean = (s: string) =>
        s
          .toLowerCase()
          .replace(
            /^(explore|exploring|visit|visiting|go to|check in to|check-in to|arrival at|arrival and)\s+/,
            ''
          )
          .replace(/[^a-z0-9]/g, '')
          .trim()

      const filteredUpsertItems: any[] = []
      if (p.upsert_items) {
        for (const item of p.upsert_items) {
          cleanseAndValidateItineraryItem(item)

          if (!item.id) {
            const coreNew = clean(item.title)
            const isDuplicate = dbItems?.some((existing: any) => {
              if (p.delete_item_ids?.includes(existing.id)) return false
              if (existing.day_number !== item.day_number) return false

              const coreExisting = clean(existing.title)
              if (coreNew === coreExisting && coreNew.length > 2) return true

              const cleanLocNew = item.location_name.toLowerCase().replace(/[^a-z0-9]/g, '')
              const cleanLocExisting = existing.location_name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
              if (cleanLocNew === cleanLocExisting && cleanLocNew.length > 2) {
                if (coreNew.includes(coreExisting) || coreExisting.includes(coreNew)) return true
              }
              return false
            })

            if (isDuplicate) {
              skipped_duplicates.push(item.title)
              continue
            }
          }
          filteredUpsertItems.push(item)
        }
      }

      if (!isAdmin && plan?.group_id) {
        if (p.delete_item_ids) {
          for (const id of p.delete_item_ids) {
            const { data: existing } = await supabase
              .from('itinerary_items')
              .select('*')
              .eq('id', id)
              .single()
            if (existing && existing.suggestion_status !== 'suggestion') {
              await supabase.from('itinerary_items').insert({
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
                parent_item_id: id,
                is_delete_suggestion: true,
                created_by: user.id,
              })
              deleted_count++
            }
          }
        }

        if (filteredUpsertItems.length > 0) {
          for (const item of filteredUpsertItems) {
            const { lat, lng } = await getCoordinatesForLocation(
              item.location_name,
              plan?.destination_name
            )

            if (item.id) {
              const { data: existing } = await supabase
                .from('itinerary_items')
                .select('*')
                .eq('id', item.id)
                .single()
              if (existing) {
                if (
                  existing.suggestion_status === 'suggestion' &&
                  existing.created_by === user.id
                ) {
                  await supabase
                    .from('itinerary_items')
                    .update({
                      title: item.title,
                      description: item.description,
                      location_name: item.location_name,
                      lat,
                      lng,
                      category: item.category,
                      duration_minutes: item.duration_minutes,
                      estimated_cost: item.estimated_cost,
                    })
                    .eq('id', item.id)
                } else {
                  await supabase.from('itinerary_items').insert({
                    plan_id: planId,
                    day_number: item.day_number,
                    time_of_day: item.time_of_day,
                    title: item.title,
                    description: item.description,
                    location_name: item.location_name,
                    lat,
                    lng,
                    category: item.category,
                    duration_minutes: item.duration_minutes,
                    estimated_cost: item.estimated_cost,
                    suggestion_status: 'suggestion',
                    parent_item_id: item.id,
                    created_by: user.id,
                  })
                }
              }
            } else {
              await supabase.from('itinerary_items').insert({
                plan_id: planId,
                day_number: item.day_number,
                time_of_day: item.time_of_day,
                title: item.title,
                description: item.description,
                location_name: item.location_name,
                lat,
                lng,
                category: item.category,
                duration_minutes: item.duration_minutes,
                estimated_cost: item.estimated_cost,
                suggestion_status: 'suggestion',
                created_by: user.id,
              })
            }
            upserted_count++
          }
        }

        return {
          success: true,
          deleted_count,
          upserted_count,
          proposed: true,
          skipped_duplicates,
        }
      }

      if (p.delete_item_ids && p.delete_item_ids.length > 0) {
        const { error: deleteError } = await supabase
          .from('itinerary_items')
          .delete()
          .in('id', p.delete_item_ids)
        if (deleteError)
          return { success: false, error: `Deletion failed: ${deleteError.message}` }
        deleted_count = p.delete_item_ids.length
      }

      if (filteredUpsertItems.length > 0) {
        const preparedItems = []
        for (const item of filteredUpsertItems) {
          let lat = 0
          let lng = 0
          if (item.id) {
            const { data: existing } = await supabase
              .from('itinerary_items')
              .select('*')
              .eq('id', item.id)
              .single()
            if (existing) {
              lat = existing.lat
              lng = existing.lng
              if (item.location_name && item.location_name !== existing.location_name) {
                const coords = await getCoordinatesForLocation(
                  item.location_name,
                  plan?.destination_name
                )
                lat = coords.lat
                lng = coords.lng
              }
            }
          } else {
            const coords = await getCoordinatesForLocation(
              item.location_name,
              plan?.destination_name
            )
            lat = coords.lat
            lng = coords.lng
          }

          preparedItems.push({
            ...(item.id ? { id: item.id } : {}),
            plan_id: planId,
            day_number: item.day_number,
            time_of_day: item.time_of_day,
            title: item.title,
            description: item.description,
            location_name: item.location_name,
            category: item.category,
            duration_minutes: item.duration_minutes,
            estimated_cost: item.estimated_cost,
            lat,
            lng,
            sort_order: 99,
            suggestion_status: 'approved',
          })
        }

        const toUpdate = preparedItems.filter((item) => !!item.id)
        const toInsert = preparedItems.filter((item) => !item.id)

        if (toUpdate.length > 0) {
          const { error: updateError } = await supabase.from('itinerary_items').upsert(toUpdate)
          if (updateError)
            return { success: false, error: `Update failed: ${updateError.message}` }
          upserted_count += toUpdate.length
        }

        if (toInsert.length > 0) {
          const { error: insertError } = await supabase.from('itinerary_items').insert(toInsert)
          if (insertError)
            return { success: false, error: `Insert failed: ${insertError.message}` }
          upserted_count += toInsert.length
        }
      }

      return { success: true, deleted_count, upserted_count, skipped_duplicates }
    },
  })
}
