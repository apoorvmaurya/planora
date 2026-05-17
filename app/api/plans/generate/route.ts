import { streamText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { buildPromptContext } from '@/lib/ai/prompts'

import { z } from 'zod'

export const maxDuration = 60

const generateSchema = z.object({
  destination: z.object({ name: z.string(), lat: z.number(), lng: z.number() }),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive(),
  currency: z.string().length(3),
  groupId: z.string(),
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
  const { destination, startDate, endDate, budget, currency, groupId, preferences } = parsed.data

  // Rate Limiting (max 10 requests per minute per user)
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  const { count } = await supabase
    .from('request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('endpoint', '/api/plans/generate')
    .gte('created_at', oneMinuteAgo)

  if (count && count >= 10) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429 })
  }

  await supabase.from('request_logs').insert({ user_id: user.id, endpoint: '/api/plans/generate' })

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

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      group_id: groupId === 'solo' ? null : groupId,
      title: `Trip to ${destination.name}`,
      description: `A ${preferences.pace} ${preferences.tripType} trip.`,
      destination_name: destination.name,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      start_date: startDate,
      end_date: endDate,
      budget_total: budget,
      currency: currency,
      created_by: user.id,
      status: 'draft'
    })
    .select()
    .single()

  if (planError) {
    return new Response(JSON.stringify({ error: planError.message }), { status: 500 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const fullPrompt = `${prompt}
  
  **Important Formatting Rules:**
  - DO NOT wrap the output in markdown codeblocks like \`\`\`json. Output ONLY raw JSON text.
  - Create ${days} days of itinerary.
  - Each day should have 3-5 distinct items (e.g. Morning, Afternoon, Evening).
  - Output JSON matching this EXACT structure:
  {
    "title": "string (Catchy name for the trip)",
    "days": [
      {
        "day_number": number,
        "itinerary_items": [
          {
            "title": "string",
            "description": "string",
            "time_of_day": "Morning" | "Afternoon" | "Evening" | "Night",
            "location_name": "string",
            "lat": number,
            "lng": number,
            "category": "activity" | "food" | "transport" | "accommodation" | "leisure",
            "duration_minutes": number,
            "estimated_cost": number
          }
        ]
      }
    ]
  }
  `

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    prompt: fullPrompt,
    async onFinish({ text }) {
      try {
        const cleanText = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
        const object = JSON.parse(cleanText)

        if (object?.title) {
          await supabase.from('plans').update({ title: object.title }).eq('id', plan.id)
        }
        
        if (object?.days) {
          const itemsToInsert = []
          for (const day of object.days) {
            let sortOrder = 0
            for (const item of day.itinerary_items) {
              itemsToInsert.push({
                plan_id: plan.id,
                day_number: day.day_number,
                time_of_day: item.time_of_day,
                title: item.title,
                description: item.description,
                location_name: item.location_name,
                lat: item.lat,
                lng: item.lng,
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

  const response = result.toTextStreamResponse()
  response.headers.set('X-Planora-Plan-Id', plan.id)
  
  return response
}
