import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObject } from 'ai'
import { z } from 'zod'
import { groq } from '@ai-sdk/groq'
import { forwardGeocode } from "@/lib/locationiq/geocode"

const itineraryItemSchema = z.object({
  title: z.string().describe('Short title for the activity'),
  description: z.string().describe('Detailed description'),
  time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
  location_name: z.string().describe('Name of the venue or location'),
  category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
  duration_minutes: z.number().describe('Estimated duration in minutes'),
  estimated_cost: z.number().describe('Estimated cost in plan currency'),
})

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { item_id } = await req.json()
  if (!item_id) return NextResponse.json({ error: "Missing item_id" }, { status: 400 })

  const { data: item } = await supabase.from('itinerary_items').select('*').eq('id', item_id).single()
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()

  try {
    const { object: newItemData } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      schema: itineraryItemSchema,
      prompt: `You are an expert travel planner AI for Planora.
The group is traveling to ${plan.destination_name}.
They previously had an itinerary item for ${item.time_of_day}:
Title: ${item.title}
Description: ${item.description}
Cost: ${item.estimated_cost} ${plan.currency}

This item has resulted in a tied vote. Please generate a SINGLE alternative itinerary item that fits the same time of day (${item.time_of_day}) and similar budget. It should be completely different from "${item.title}".`,
    })

    let lat = 0
    let lng = 0
    try {
      const coords = await forwardGeocode(newItemData.location_name)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
      }
    } catch (err) {
      console.error("Geocoding failed for resuggest:", err)
    }

    // Update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from('itinerary_items')
      .update({
        title: `[Tie-Breaker] ${newItemData.title}`,
        description: newItemData.description,
        location_name: newItemData.location_name,
        lat: lat,
        lng: lng,
        category: newItemData.category,
        duration_minutes: newItemData.duration_minutes,
        estimated_cost: newItemData.estimated_cost,
        history: [...(item.history || []), {
          title: item.title,
          description: item.description,
          time_of_day: item.time_of_day,
          location_name: item.location_name,
          lat: item.lat,
          lng: item.lng,
          category: item.category,
          duration_minutes: item.duration_minutes,
          estimated_cost: item.estimated_cost,
          saved_at: new Date().toISOString()
        }]
      })
      .eq('id', item_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Reset votes
    await supabase.from('member_votes').delete().eq('item_id', item_id)

    return NextResponse.json({ success: true, item: updatedItem })
  } catch (error: any) {
    console.error("Resuggest error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
