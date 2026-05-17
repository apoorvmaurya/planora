import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'

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

  const prompt = `
    You are an expert travel planner AI for Planora.
    The group is traveling to ${plan.destination_name}.
    They previously had an itinerary item for ${item.time_of_day}:
    Title: ${item.title}
    Description: ${item.description}
    Cost: ${item.estimated_cost} ${plan.currency}
    
    This item has resulted in a tied vote. Please generate a SINGLE alternative itinerary item that fits the same time of day (${item.time_of_day}) and similar budget. It should be completely different from "${item.title}".
    
    Output ONLY valid JSON matching this structure exactly (no markdown formatting):
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
  `

  try {
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: prompt,
    })

    const cleanText = result.text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const newItemData = JSON.parse(cleanText)

    // Update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from('itinerary_items')
      .update({
        title: `[Tie-Breaker] ${newItemData.title}`,
        description: newItemData.description,
        location_name: newItemData.location_name,
        lat: newItemData.lat,
        lng: newItemData.lng,
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
