import { streamText, Output } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { buildPromptContext, itineraryResponseSchema } from '@/lib/ai/prompts'
import { getCoordinatesForLocation } from '@/lib/locationiq/geocode'
import { getItemSortScore, cleanseAndValidateItineraryItem } from '@/lib/itinerary/sort'
import { getPlanAccess } from '@/lib/security/access'
import { AI_MODELS } from '@/lib/ai/models'

import { z } from 'zod'

// Suppress AI SDK warnings (e.g. compatibility/responseFormat schema alerts on Groq)
;(globalThis as any).AI_SDK_LOG_WARNINGS = false

export const maxDuration = 60

const generateSchema = z.object({
  planId: z.string().uuid(),
  destination: z.object({ name: z.string(), lat: z.number(), lng: z.number() }),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive(),
  currency: z.string().length(3),
  groupId: z.string(),
  saveToDb: z.boolean().optional(),
  preferences: z.object({
    tripType: z.string(),
    pace: z.string(),
    dietaryNotes: z.string().optional(),
    mustHaves: z.string().optional(),
    avoid: z.string().optional()
  })
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return new Response("Unauthorized", { status: 401 })

  const rawBody = await req.json()
  const body = rawBody.input ?? rawBody
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error }), { status: 400 })
  }
  const { planId, destination, startDate, endDate, budget, currency, groupId, preferences, saveToDb } = parsed.data

  // Verify plan exists and user is authorized using centralized access helper
  const { isAuthorized, plan } = await getPlanAccess(supabase, planId, user.id)

  if (!plan) {
    return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404 })
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized access to plan" }), { status: 403 })
  }

  let members: any[] = []
  if (groupId !== 'solo') {
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user:profiles(*)')
      .eq('group_id', groupId)
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

  const prompt = await buildPromptContext({
    destination, startDate, endDate, budget, currency, preferences, members
  })

  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const fullPrompt = `${prompt}
  
  **Important Formatting Rules:**
  - Create ${days} days of itinerary.
  - Each day should have 3-5 distinct items (e.g. Morning, Afternoon, Evening).
  - You MUST adhere strictly to the JSON schema. Do NOT create top-level keys like "tripDetails", "groupMembers", or nested time-slots. The root object of your JSON response must contain ONLY "title" (string) and "days" (array of day objects). Each day object must contain "day_number" (number) and "itinerary_items" (array of itinerary items).
  `

  const model = AI_MODELS.structured

  const result = streamText({
    model,
    prompt: fullPrompt,
    maxOutputTokens: 4000,
    output: Output.object({ schema: itineraryResponseSchema }),
    providerOptions: {
      groq: {
        structuredOutputs: false,
      },
    },
  })

  // Start background task to save to database when stream finishes
  Promise.resolve(result.output).then(async (object) => {
    try {
      if (saveToDb === false) {
        // Compare & merge drawer handles saving manually on approval
        return
      }

      if (object?.title) {
        await supabase.from('plans').update({ title: object.title }).eq('id', planId)
      }
      
      if (object?.days) {
        // Delete old itinerary items for this plan first to enable clean regeneration
        await supabase.from('itinerary_items').delete().eq('plan_id', planId)

        const itemsToInsert = []
        for (const day of object.days) {
          if (!day) continue
          
          const dayItems = (day.itinerary_items || []).filter(Boolean)
          dayItems.forEach(cleanseAndValidateItineraryItem)
          const sortedDayItems = [...dayItems].sort((a, b) => {
            return getItemSortScore(a) - getItemSortScore(b)
          })

          let sortOrder = 0
          for (const item of sortedDayItems) {
            let lat = item.lat
            let lng = item.lng
            
            // Only trigger forwardGeocode lookup if coordinates are missing/zero from the AI model response
            if (!lat || !lng) {
              const coords = await getCoordinatesForLocation(item.location_name, destination.name)
              lat = coords.lat
              lng = coords.lng
            }

            itemsToInsert.push({
              plan_id: planId,
              day_number: day.day_number,
              time_of_day: item.time_of_day,
              title: item.title,
              description: item.description,
              location_name: item.location_name,
              lat: lat || 0,
              lng: lng || 0,
              category: item.category,
              duration_minutes: item.duration_minutes,
              estimated_cost: item.estimated_cost,
              sort_order: sortOrder++
            })
          }
        }
        
        if (itemsToInsert.length > 0) {
          await supabase.from('itinerary_items').insert(itemsToInsert)
        }
      }
    } catch (e) {
      console.error("Failed to parse and save generated itinerary", e)
    }
  }).catch((err: unknown) => {
    console.error("Error in streamText result.output resolution:", err)
  })

  return result.toTextStreamResponse()
}
