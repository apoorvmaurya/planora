import { streamText, tool } from 'ai'
import { groq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const maxDuration = 60

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const { messages } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })
  
  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()
  const { data: items } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')

  const itemsList = items?.map((i: Record<string, unknown>) =>
    `- [ID: ${i.id}] Day ${i.day_number} (${i.time_of_day}): "${i.title}" at ${i.location_name} — ${i.description} (${i.duration_minutes}min, est. ${i.estimated_cost} ${plan?.currency})`
  ).join("\n") || "No items yet."

  const systemPrompt = `You are Planora AI, a smart and friendly travel assistant for a trip to ${plan?.destination_name}.
Trip Dates: ${plan?.start_date} to ${plan?.end_date}. Budget: ${plan?.budget_total} ${plan?.currency}.

Current Itinerary:
${itemsList}

You have tools to MODIFY the itinerary. When the user asks you to add, edit, remove, or swap items, USE THE TOOLS. After using a tool, confirm the action to the user in a friendly way.

Rules:
- When editing, only change fields the user mentioned. Keep others unchanged.
- When adding items, pick reasonable defaults for missing fields (duration: 60-120min, cost: proportional to budget).
- When deleting, confirm what was removed.
- For general questions (packing, weather, tips), just answer — don't use tools.
- Be concise, upbeat, and helpful!`

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages,
    tools: {
      add_item: tool({
        description: 'Add a new itinerary item to the plan.',
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
        execute: async (p) => {
          const { data, error } = await supabase
            .from('itinerary_items')
            .insert({ plan_id: planId, ...p, lat: 0, lng: 0, sort_order: 99 })
            .select()
            .single()
          if (error) return { success: false, error: error.message }
          return { success: true, item: data }
        }
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
        execute: async ({ item_id, ...updates }) => {
          const { data: existing } = await supabase.from('itinerary_items').select('*').eq('id', item_id).single()
          if (!existing) return { success: false, error: 'Item not found' }

          const history = (existing.history as Array<Record<string, unknown>>) || []
          history.push({ ...existing, saved_at: new Date().toISOString(), saved_by: 'planora_ai' })

          const { data, error } = await supabase.from('itinerary_items').update({ ...updates, history }).eq('id', item_id).select().single()
          if (error) return { success: false, error: error.message }
          return { success: true, item: data }
        }
      }),

      delete_item: tool({
        description: 'Remove an itinerary item from the plan.',
        inputSchema: z.object({
          item_id: z.string().describe('The ID of the item to delete'),
        }),
        execute: async ({ item_id }) => {
          const { data: item } = await supabase.from('itinerary_items').select('title, day_number, time_of_day').eq('id', item_id).single()
          const { error } = await supabase.from('itinerary_items').delete().eq('id', item_id)
          if (error) return { success: false, error: error.message }
          return { success: true, deleted: item }
        }
      }),

      swap_items: tool({
        description: 'Swap the time slots of two itinerary items.',
        inputSchema: z.object({
          item_id_a: z.string().describe('First item ID'),
          item_id_b: z.string().describe('Second item ID'),
        }),
        execute: async ({ item_id_a, item_id_b }) => {
          const { data: a } = await supabase.from('itinerary_items').select('time_of_day, sort_order').eq('id', item_id_a).single()
          const { data: b } = await supabase.from('itinerary_items').select('time_of_day, sort_order').eq('id', item_id_b).single()
          if (!a || !b) return { success: false, error: 'Items not found' }

          await supabase.from('itinerary_items').update({ time_of_day: b.time_of_day, sort_order: b.sort_order }).eq('id', item_id_a)
          await supabase.from('itinerary_items').update({ time_of_day: a.time_of_day, sort_order: a.sort_order }).eq('id', item_id_b)
          return { success: true }
        }
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
