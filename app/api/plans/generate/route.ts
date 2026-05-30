import { streamObject } from 'ai'
import { groq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { buildPromptContext, itineraryResponseSchema } from '@/lib/ai/prompts'
import { forwardGeocode } from '@/lib/locationiq/geocode'

import { z } from 'zod'

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

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error }), { status: 400 })
  const { planId, destination, startDate, endDate, budget, currency, groupId, preferences, saveToDb } = parsed.data

  // Verify plan exists
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404 })
  }

  // Check authorization: must be creator OR a group member
  let isAuthorized = plan.created_by === user.id
  if (!isAuthorized && plan.group_id) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', plan.group_id)
      .eq('user_id', user.id)
      .single()
    if (membership) {
      isAuthorized = true
    }
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
  `

  const result = streamObject({
    model: groq('llama-3.3-70b-versatile'),
    schema: itineraryResponseSchema,
    prompt: fullPrompt,
    providerOptions: {
      groq: {
        structuredOutputs: false
      }
    },
    async onFinish({ object }) {
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
            let sortOrder = 0
            for (const item of day.itinerary_items || []) {
              if (!item) continue
              
              let lat = item.lat
              let lng = item.lng
              try {
                const coords = await forwardGeocode(item.location_name, destination.name)
                if (coords) {
                  lat = coords.lat
                  lng = coords.lng
                }
              } catch (e) {
                console.error("Geocoding failed for generated item in route:", e)
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
    }
  })

  return result.toTextStreamResponse()
}
