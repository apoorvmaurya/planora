import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { groq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { forwardGeocode } from '@/lib/locationiq/geocode'
import { rateLimit } from '@/lib/security/rateLimiter'
import { runInputGuardrail } from '@/lib/security/guardrails'

export const maxDuration = 60

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const { messages } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  // Rate Limiting by User ID
  const rateLimitResult = await rateLimit({
    userId: user.id,
    endpoint: `/api/plans/[planId]/chat`,
    limit: 15,
    windowMs: 60000
  })

  if (!rateLimitResult.success) {
    return new Response("Rate limit exceeded. Please wait a minute before sending another message.", { status: 429 })
  }

  // Input Guardrail Validation
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || ""
  const lastUserMessageText = typeof lastUserMessage === 'string'
    ? lastUserMessage
    : Array.isArray(lastUserMessage)
      ? lastUserMessage.map((part: any) => part.text || "").join(" ")
      : ""

  const guard = await runInputGuardrail(lastUserMessageText)
  if (!guard.safe) {
    return new Response(guard.reason || "Request blocked by safety guardrails.", { status: 400 })
  }
  
  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()
  const { data: items } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('plan_id', planId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('day_number')
    .order('sort_order')

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
- **STRICT STEP-BY-STEP MULTI-TURN PLANNING RULE**: When a user asks you to replan, regenerate, or resuggest a whole day's itinerary or a large block of activities (e.g., "resuggest the whole itinerary for the whole day"), **YOU MUST NEVER propose the full day or call database tools immediately**. You must strictly follow this isolated, conversational multi-turn flow:
  * **PHASE 1 (Propose Morning & Afternoon ONLY)**: State something like "Let's plan an exciting day in [destination]. For the morning, I suggest... In the afternoon, how about..." Propose only Morning and Afternoon activities. **NEVER** mention Evening, Night, or Accommodation plans in this response. At the end of Phase 1, ask the user: "Would you like me to go ahead with these Morning & Afternoon suggestions, or should I propose alternatives?" Then stop and wait for their response.
  * **PHASE 2 (Propose Evening & Accommodation ONLY)**: If the user says they do not like the Morning/Afternoon suggestions, suggest different options and repeat Phase 1. If the user approves/likes the Morning/Afternoon suggestions, reply *only* with the Evening & Accommodation plans, e.g., "To make the most of your evening, I recommend... As for accommodation, I suggest... How do these Evening and Accommodation plans look? Shall we lock this entire day's itinerary into your Planora workspace?" Do **NOT** call any database tools yet!
  * **PHASE 3 (Execution & Database Sync)**: ONLY after the user gives a positive conversational confirmation to your Phase 2 suggestion (e.g. "yes", "go ahead", "lock it in", "looks perfect"), call the appropriate database tools ('add_item', 'edit_item', 'delete_item', 'swap_items') sequentially to update their itinerary in the database. Once execution is complete, confirm to the user that their workspace has been updated.
  * **CRITICAL CONTROLS**:
    1. NEVER skip a phase.
    2. NEVER bombard the user with the entire day's schedule or mock outlines at the beginning.
    3. NEVER call database tools until the user has explicitly approved the full plan in Phase 3.
- For general questions (packing, weather, tips), just answer — do not use tools.
- You MUST strictly refuse to answer any questions completely unrelated to travel, trip planning, or Planora features. Under no circumstances should you write code, perform general creative writing, or serve as a general assistant.
- Be concise, upbeat, and extremely helpful!`

  const isReplanTrigger = /replan|resuggest|regenerate|re-suggest|replan/i.test(lastUserMessage)
  const toolChoice = isReplanTrigger ? 'none' : 'auto'

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    toolChoice,
    temperature: 0.1,
    maxOutputTokens: 800,
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
          let lat = 0
          let lng = 0
          try {
            const coords = await forwardGeocode(p.location_name, plan?.destination_name)
            if (coords) {
              lat = coords.lat
              lng = coords.lng
            }
          } catch (err) {
            console.error("Geocoding failed for tool add_item:", err)
          }

          const { data, error } = await supabase
            .from('itinerary_items')
            .insert({ plan_id: planId, ...p, lat, lng, sort_order: 99 })
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
        execute: async ({ item_id, ...updates }: {
          item_id: string
          title?: string
          description?: string
          time_of_day?: 'Morning' | 'Afternoon' | 'Evening' | 'Night'
          location_name?: string
          duration_minutes?: number
          estimated_cost?: number
        }) => {
          const { data: existing } = await supabase.from('itinerary_items').select('*').eq('id', item_id).single()
          if (!existing) return { success: false, error: 'Item not found' }

          let lat = existing.lat
          let lng = existing.lng

          if (updates.location_name && updates.location_name !== existing.location_name) {
            try {
              const coords = await forwardGeocode(updates.location_name, plan?.destination_name)
              if (coords) {
                lat = coords.lat
                lng = coords.lng
              }
            } catch (err) {
              console.error("Geocoding failed for tool edit_item:", err)
            }
          }

          const history = (existing.history as Array<Record<string, unknown>>) || []
          history.push({ ...existing, saved_at: new Date().toISOString(), saved_by: 'planora_ai' })

          const { data, error } = await supabase.from('itinerary_items').update({ ...updates, lat, lng, history }).eq('id', item_id).select().single()
          if (error) return { success: false, error: error.message }
          return { success: true, item: data }
        }
      }),

      delete_item: tool({
        description: 'Remove an itinerary item from the plan.',
        inputSchema: z.object({
          item_id: z.string().describe('The ID of the item to delete'),
        }),
        execute: async ({ item_id }: { item_id: string }) => {
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
        execute: async ({ item_id_a, item_id_b }: { item_id_a: string; item_id_b: string }) => {
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
