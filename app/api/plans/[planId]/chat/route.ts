import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getCoordinatesForLocation } from '@/lib/locationiq/geocode'
import { rateLimit } from '@/lib/security/rateLimiter'
import { runInputGuardrail } from '@/lib/security/guardrails'
import { withFallback } from '@/lib/ai/fallback'
import { reorderDayItems, cleanseAndValidateItineraryItem } from '@/lib/itinerary/sort'
import { getPlanAccess } from '@/lib/security/access'
import { AI_MODELS } from '@/lib/ai/models'

// Suppress AI SDK warnings
;(globalThis as any).AI_SDK_LOG_WARNINGS = false

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
  
  const { isAuthorized, isAdmin, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!plan) return new Response("Plan not found", { status: 404 })
  if (!isAuthorized) return new Response("Access denied to plan", { status: 403 })

  const { data: items } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('plan_id', planId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('day_number')
    .order('sort_order')

  const itemsList = items?.map((i: Record<string, any>) => {
    const statusText = i.suggestion_status === 'suggestion' 
      ? ` [PROPOSED SUGGESTION${i.is_delete_suggestion ? ' (DELETE)' : ''}]` 
      : ""
    return `- [ID: ${i.id}] Day ${i.day_number} (${i.time_of_day}): "${i.title}" at ${i.location_name} — ${i.description} (${i.duration_minutes}min, est. ${i.estimated_cost} ${plan?.currency})${statusText}`
  }).join("\n") || "No items yet."

  let members: any[] = []
  if (plan.group_id) {
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user:profiles(*)')
      .eq('group_id', plan.group_id)
    members = groupMembers?.map((m: any) => m.user) || []
  } else {
    // Solo trip: fetch the current traveler's profile to pass their preferences to the LLM
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profile) {
      members = [profile]
    }
  }

  const memberContext = members.map((m: any) => 
    `- ${m.full_name} from ${m.city || 'Unknown'}. Preferences: ${JSON.stringify(m.travel_preferences || {})}`
  ).join("\n") || "No member preferences recorded."

  const systemPrompt = `You are Planora AI, a smart and friendly travel assistant for a trip to ${plan?.destination_name}.
Trip Dates: ${plan?.start_date} to ${plan?.end_date}. Budget: ${plan?.budget_total} ${plan?.currency}.
User Role: ${isAdmin ? 'Admin' : 'Group Member'}.

Group Members & Preferences:
${memberContext}

${!isAdmin && plan?.group_id ? `Note: You are chatting with a Group Member. Non-admins cannot modify the official itinerary directly. Any changes (add, edit, delete) you make on their behalf will automatically be created as "Suggestions" or "Delete Proposals" for the group to vote on, rather than modifying official items directly. Ensure the user knows this!` : ''}

Current Itinerary:
${itemsList}

You have tools to MODIFY the itinerary. When the user asks you to add, edit, remove, or swap items, USE THE TOOLS. After using a tool, confirm the action to the user in a friendly way.

Important:
- You have a bulk update tool called 'bulk_update_itinerary' that lets you add, update, and delete multiple items in a single tool call. Use this tool whenever the user wants to update multiple activities, replace a whole day's activities, or replan large sections of their itinerary. This is highly preferred over calling 'add_item'/'delete_item' multiple times!

### Cognitive Travel Planning & Validation Rules
You must validate all itinerary edits for logical flow, geographical consistency, pacing, and context before invoking tools:
1. **Geographical Coherence**:
   - Ensure activities in a single day are in the same general region or city, or follow a logical journey progression.
   - Do not schedule activities that are geographically far apart back-to-back on the same day without adding a preceding 'transport' or 'transit' item with an appropriate travel duration.
   - If an activity is physically impossible to reach in the given timeframe, flag it to the user and suggest scheduling it on a different day.
2. **Temporal Pacing & Time Budgets**:
   - Prevent overloading a single day. The sum of all active activity durations on a single day should not exceed 8–10 hours of active scheduled time.
   - If adding a new item will overload the day, suggest shortening or replacing an existing item, or moving it to another day.
   - Maintain a balanced pacing: allocate at most 1–2 primary activities per time slot (Morning, Afternoon, Evening, Night) to avoid frantic rushes.
3. **Logical Daily Sequencing**:
   - Order items sequentially by time of day: Morning -> Afternoon -> Evening -> Night.
   - **Transit/Arrivals**: Must occur at the beginning of a travel segment (usually Morning/Afternoon) before other activities.
   - **Overnight Stays & Accommodations (e.g. Hotels, Oyo rooms)**: Stays representing night lodging must be scheduled in the 'Night' slot at the end of the day. Stays should never be placed in the Morning or Afternoon slots unless it is a quick check-in placeholder.
   - **Meals**: Lunch belongs in Afternoon, and Dinner belongs in Evening/Night.
4. **Context-Aware Incremental Modifications**:
   - Before executing tools, scan the existing items (both approved items and proposed suggestions) to avoid duplicating bookings or adding conflicting plans.
   - **Targeted Conditionals (e.g., "add stay after long transits")**: If a user asks to add stays/accommodations after long transits, identify specific days that have a transit/transport activity with a duration of 120 minutes or longer. Place the stay *only* on those specific days, immediately following the transit (in the next chronological slot or the Night slot), instead of blindly duplicating it across all days of the trip.
5. **Strict Deduplication & Safety Checks**:
   - Check the **Current Itinerary** list before calling \`add_item\` or \`bulk_update_itinerary\`. If the user asks to add an activity (e.g., "Sunder Nursery") that matches or is extremely similar to an activity already scheduled on that day, DO NOT call any tool. Instead, reply directly to the user saying that the activity is already scheduled on that day, and ask if they would like to reschedule it or do something else.
   - **Conversational Recommendations**: If the user asks for suggestions, recommendations, or ideas of things to do, check the entire **Current Itinerary** first. Under no circumstances should you suggest, recommend, or mention any place, attraction, restaurant, hotel, or activity that is already scheduled on any day of the trip. Always recommend completely new, distinct, and unique places.

Rules:
- When editing, only change fields the user mentioned. Keep others unchanged.
- When adding items, pick reasonable defaults for missing fields (duration: 60-120min, cost: proportional to budget).
- When deleting, confirm what was removed.
- **STEP-BY-STEP MULTI-TURN PLANNING RULE (WITH BYPASS FOR DIRECT REQUESTS OR WHOLE-TRIP REGENERATION)**: When a user asks you to replan, regenerate, or resuggest a day's itinerary or a block of activities, you should generally follow a conversational multi-turn flow (Phase 1: Propose Morning/Afternoon, Phase 2: Propose Evening/Accommodation, Phase 3: Execute).
  * **BYPASS EXCEPTION (DIRECT OR WHOLE-TRIP REQUESTS)**: If the user explicitly asks you to make the changes directly without asking (e.g., "without asking me", "do it directly", "skip confirmation"), or if the user asks you to regenerate/replan the *entire/whole trip's itinerary*, **YOU MUST BYPASS** the conversational phases and call 'bulk_update_itinerary' immediately in a single turn to apply the full changes to the workspace!
  * **Phase Details**:
    * **PHASE 1 (Propose Morning & Afternoon ONLY)**: State something like "Let's plan an exciting day in [destination]. For the morning, I suggest... In the afternoon, how about..." Propose only Morning and Afternoon activities. **NEVER** mention Evening, Night, or Accommodation plans in this response. At the end of Phase 1, ask the user: "Would you like me to go ahead with these Morning & Afternoon suggestions, or should I propose alternatives?" Then stop and wait for their response.
    * **PHASE 2 (Propose Evening & Accommodation ONLY)**: If the user approves, reply *only* with the Evening & Accommodation plans. Ask "How do these Evening and Accommodation plans look? Shall we lock this entire day's itinerary into your Planora workspace?" Do **NOT** call any database tools yet!
    * **PHASE 3 (Execution & Database Sync)**: ONLY after the user gives a positive conversational confirmation, call 'bulk_update_itinerary' to perform the updates in a single action to sync with the database. Once execution is complete, confirm to the user that their workspace has been updated.
  * **CRITICAL CONTROLS**:
    1. NEVER skip a phase unless a bypass exception is met.
    2. NEVER call database tools until the user has explicitly approved the full plan, unless a bypass exception is met.
- For general questions (packing, weather, tips), just answer — do not use tools.
- You MUST strictly refuse to answer any questions completely unrelated to travel, trip planning, or Planora features. Under no circumstances should you write code, perform general creative writing, or serve as a general assistant.
- Be concise, upbeat, and extremely helpful!`

  const isReplanTrigger = /replan|resuggest|regenerate|re-suggest/i.test(lastUserMessage)
  const isDirectRequest = /direct|without asking|skip|directly|force/i.test(lastUserMessage)
  const isWholeTrip = /whole|entire|all days|full trip/i.test(lastUserMessage)
  const toolChoice = (isReplanTrigger && !isDirectRequest && !isWholeTrip) ? 'none' : 'auto'

  const baseModel = AI_MODELS.chat
  const backupModel = AI_MODELS.chatFallback
  const modelWithFallback = withFallback(baseModel, backupModel)

  const result = streamText({
    model: modelWithFallback,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    toolChoice,
    temperature: 0.1,
    maxOutputTokens: 800,
    tools: {
      add_item: tool({
        description: 'Add a new itinerary item to the plan. Stays/Hotels must always be placed in the Night slot as the final item of the day. Transit items belong at the start of travel segments. Check geographical and duration constraints before calling this.',
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
          // Apply slot corrections
          cleanseAndValidateItineraryItem(p)

          // Check for duplicates
          const { data: existingItems } = await supabase
            .from('itinerary_items')
            .select('title, location_name')
            .eq('plan_id', planId)
            .eq('day_number', p.day_number)

          const clean = (s: string) => s.toLowerCase().replace(/^(explore|exploring|visit|visiting|go to|check in to|check-in to|arrival at|arrival and)\s+/, '').replace(/[^a-z0-9]/g, '').trim()
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
              error: `The activity "${p.title}" is already scheduled on Day ${p.day_number}. Duplicate activities are not allowed.`
            }
          }

          const { lat, lng } = await getCoordinatesForLocation(p.location_name, plan?.destination_name)

           const { data, error } = await supabase
            .from('itinerary_items')
            .insert({ 
              plan_id: planId, 
              ...p, 
              lat, 
              lng, 
              sort_order: 99,
              suggestion_status: (isAdmin || !plan?.group_id) ? 'approved' : 'suggestion',
              created_by: user.id
            })
            .select()
            .single()
          if (error) return { success: false, error: error.message }
          
          // Chronologically and logically sort items for this day
          await reorderDayItems(supabase, planId, p.day_number)
          
          // Retrieve the newly sorted item details
          const { data: reordered } = await supabase
            .from('itinerary_items')
            .select('*')
            .eq('id', data.id)
            .single()

          return { success: true, item: reordered || data }
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

          // Merge updates and validate slots
          const merged = { ...existing, ...updates }
          cleanseAndValidateItineraryItem(merged)
          if (updates.time_of_day) {
            updates.time_of_day = merged.time_of_day
          }

          let lat = existing.lat
          let lng = existing.lng

          if (updates.location_name && updates.location_name !== existing.location_name) {
            const coords = await getCoordinatesForLocation(updates.location_name, plan?.destination_name)
            lat = coords.lat
            lng = coords.lng
          }

          const isDirectEdit = isAdmin || !plan?.group_id || (existing.suggestion_status === 'suggestion' && existing.created_by === user.id)

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

            // Reorder day items logically
            await reorderDayItems(supabase, planId, existing.day_number)

            // Fetch updated reordered item
            const { data: reordered } = await supabase
              .from('itinerary_items')
              .select('*')
              .eq('id', item_id)
              .single()

            return { success: true, item: reordered || data }
          } else {
            // Member proposing an edit to an approved item: insert alternative suggestion
            const { data, error } = await supabase
              .from('itinerary_items')
              .insert({
                plan_id: planId,
                day_number: existing.day_number,
                time_of_day: updates.time_of_day !== undefined ? updates.time_of_day : existing.time_of_day,
                title: updates.title !== undefined ? updates.title : existing.title,
                description: updates.description !== undefined ? updates.description : existing.description,
                location_name: updates.location_name !== undefined ? updates.location_name : existing.location_name,
                lat,
                lng,
                category: existing.category,
                duration_minutes: updates.duration_minutes !== undefined ? updates.duration_minutes : existing.duration_minutes,
                estimated_cost: updates.estimated_cost !== undefined ? updates.estimated_cost : existing.estimated_cost,
                sort_order: existing.sort_order,
                suggestion_status: 'suggestion',
                parent_item_id: item_id,
                created_by: user.id
              })
              .select()
              .single()
            if (error) return { success: false, error: error.message }

            // Reorder day items logically
            await reorderDayItems(supabase, planId, existing.day_number)

            // Fetch updated reordered proposed item
            const { data: reordered } = await supabase
              .from('itinerary_items')
              .select('*')
              .eq('id', data.id)
              .single()

            return { success: true, item: reordered || data, proposed: true }
          }
        }
      }),

      delete_item: tool({
        description: 'Remove an itinerary item from the plan.',
        inputSchema: z.object({
          item_id: z.string().describe('The ID of the item to delete'),
        }),
        execute: async ({ item_id }: { item_id: string }) => {
          const { data: existing } = await supabase.from('itinerary_items').select('*').eq('id', item_id).single()
          if (!existing) return { success: false, error: 'Item not found' }

          const isDirectDelete = isAdmin || !plan?.group_id || (existing.suggestion_status === 'suggestion' && existing.created_by === user.id)

          if (isDirectDelete) {
            const { error } = await supabase.from('itinerary_items').delete().eq('id', item_id)
            if (error) return { success: false, error: error.message }

            // Reorder remaining items logically
            await reorderDayItems(supabase, planId, existing.day_number)

            return { success: true, deleted: existing }
          } else {
            // Propose delete suggestion
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
                created_by: user.id
              })
              .select()
              .single()
            if (error) return { success: false, error: error.message }

            // Reorder day items logically
            await reorderDayItems(supabase, planId, existing.day_number)

            return { success: true, item: data, proposed: true }
          }
        }
      }),

      swap_items: tool({
        description: 'Swap the time slots of two itinerary items.',
        inputSchema: z.object({
          item_id_a: z.string().describe('First item ID'),
          item_id_b: z.string().describe('Second item ID'),
        }),
        execute: async ({ item_id_a, item_id_b }: { item_id_a: string; item_id_b: string }) => {
          if (!isAdmin && plan?.group_id) {
            return { success: false, error: "Only group admins can swap activity orders." }
          }

          const { data: a } = await supabase.from('itinerary_items').select('time_of_day, sort_order').eq('id', item_id_a).single()
          const { data: b } = await supabase.from('itinerary_items').select('time_of_day, sort_order').eq('id', item_id_b).single()
          if (!a || !b) return { success: false, error: 'Items not found' }

          await supabase.from('itinerary_items').update({ time_of_day: b.time_of_day, sort_order: b.sort_order }).eq('id', item_id_a)
          await supabase.from('itinerary_items').update({ time_of_day: a.time_of_day, sort_order: a.sort_order }).eq('id', item_id_b)
          return { success: true }
        }
      }),

      bulk_update_itinerary: tool({
        description: 'Perform bulk additions, deletions, or updates to the itinerary. Ensure all upserted items are ordered logically (e.g. stays in the Night slot, transit on arrival) and follow geographical coherence. Avoid day overload.',
        inputSchema: z.object({
          delete_item_ids: z.array(z.string().uuid()).optional().describe('List of itinerary item IDs to delete.'),
          upsert_items: z.array(z.object({
            id: z.string().uuid().optional().describe('If updating an existing item, specify its ID. If creating a new item, omit this field.'),
            day_number: z.number().describe('Day of the trip (1-based)'),
            time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
            title: z.string().describe('Title of the activity'),
            description: z.string().describe('Detailed description'),
            location_name: z.string().describe('Location name'),
            category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
            duration_minutes: z.number().describe('Duration in minutes'),
            estimated_cost: z.number().describe('Estimated cost in plan currency')
          })).optional().describe('List of new or updated itinerary items.')
        }),
        execute: async (p: {
          delete_item_ids?: string[]
          upsert_items?: any[]
        }) => {
          let deleted_count = 0
          let upserted_count = 0
          const skipped_duplicates: string[] = []

          // Fetch all existing database items for deduplication
          const { data: dbItems } = await supabase
            .from('itinerary_items')
            .select('id, title, location_name, day_number')
            .eq('plan_id', planId)

          const clean = (s: string) => s.toLowerCase().replace(/^(explore|exploring|visit|visiting|go to|check in to|check-in to|arrival at|arrival and)\s+/, '').replace(/[^a-z0-9]/g, '').trim()

          // Filter out duplicates from upsert_items
          const filteredUpsertItems: any[] = []
          if (p.upsert_items) {
            for (const item of p.upsert_items) {
              // Apply slot validation
              cleanseAndValidateItineraryItem(item)

              if (!item.id) {
                const coreNew = clean(item.title)
                const isDuplicate = dbItems?.some((existing: any) => {
                  if (p.delete_item_ids?.includes(existing.id)) return false
                  if (existing.day_number !== item.day_number) return false

                  const coreExisting = clean(existing.title)
                  if (coreNew === coreExisting && coreNew.length > 2) return true

                  const cleanLocNew = item.location_name.toLowerCase().replace(/[^a-z0-9]/g, '')
                  const cleanLocExisting = existing.location_name.toLowerCase().replace(/[^a-z0-9]/g, '')
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
            // Members create suggestions for bulk modifications
            if (p.delete_item_ids) {
              for (const id of p.delete_item_ids) {
                const { data: existing } = await supabase.from('itinerary_items').select('*').eq('id', id).single()
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
                    created_by: user.id
                  })
                  deleted_count++
                }
              }
            }

            if (filteredUpsertItems.length > 0) {
              for (const item of filteredUpsertItems) {
                const { lat, lng } = await getCoordinatesForLocation(item.location_name, plan?.destination_name)

                if (item.id) {
                  const { data: existing } = await supabase.from('itinerary_items').select('*').eq('id', item.id).single()
                  if (existing) {
                    if (existing.suggestion_status === 'suggestion' && existing.created_by === user.id) {
                      await supabase.from('itinerary_items').update({
                        title: item.title,
                        description: item.description,
                        location_name: item.location_name,
                        lat,
                        lng,
                        category: item.category,
                        duration_minutes: item.duration_minutes,
                        estimated_cost: item.estimated_cost
                      }).eq('id', item.id)
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
                        created_by: user.id
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
                    created_by: user.id
                  })
                }
                upserted_count++
              }
            }

            return { success: true, deleted_count, upserted_count, proposed: true, skipped_duplicates }
          }

          // Admins or Solo Trips: Direct Modification
          if (p.delete_item_ids && p.delete_item_ids.length > 0) {
            const { error: deleteError } = await supabase
              .from('itinerary_items')
              .delete()
              .in('id', p.delete_item_ids)
            if (deleteError) return { success: false, error: `Deletion failed: ${deleteError.message}` }
            deleted_count = p.delete_item_ids.length
          }

          if (filteredUpsertItems.length > 0) {
            const preparedItems = []
            for (const item of filteredUpsertItems) {
              let lat = 0
              let lng = 0
              if (item.id) {
                const { data: existing } = await supabase.from('itinerary_items').select('*').eq('id', item.id).single()
                if (existing) {
                  lat = existing.lat
                  lng = existing.lng
                  if (item.location_name && item.location_name !== existing.location_name) {
                    const coords = await getCoordinatesForLocation(item.location_name, plan?.destination_name)
                    lat = coords.lat
                    lng = coords.lng
                  }
                }
              } else {
                const coords = await getCoordinatesForLocation(item.location_name, plan?.destination_name)
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
                suggestion_status: 'approved'
              })
            }

            const toUpdate = preparedItems.filter(item => !!item.id)
            const toInsert = preparedItems.filter(item => !item.id)

            if (toUpdate.length > 0) {
              const { error: updateError } = await supabase.from('itinerary_items').upsert(toUpdate)
              if (updateError) return { success: false, error: `Update failed: ${updateError.message}` }
              upserted_count += toUpdate.length
            }

            if (toInsert.length > 0) {
              const { error: insertError } = await supabase.from('itinerary_items').insert(toInsert)
              if (insertError) return { success: false, error: `Insert failed: ${insertError.message}` }
              upserted_count += toInsert.length
            }
          }

          return { success: true, deleted_count, upserted_count, skipped_duplicates }
        }
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
