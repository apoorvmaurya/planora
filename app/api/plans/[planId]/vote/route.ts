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
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { item_id, vote } = await req.json()
  if (!item_id || !vote) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  const { data: existingVote } = await supabase
    .from('member_votes')
    .select('id, vote')
    .eq('item_id', item_id)
    .eq('user_id', user.id)
    .single()

  if (existingVote) {
    if (existingVote.vote === vote) {
      const { error } = await supabase.from('member_votes').delete().eq('id', existingVote.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase.from('member_votes').update({ vote }).eq('id', existingVote.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabase.from('member_votes').insert({
      plan_id: planId,
      item_id,
      user_id: user.id,
      vote
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check for auto tie-breaker
  const { data: plan } = await supabase.from('plans').select('group_id, destination_name, currency').eq('id', planId).single()
  if (plan) {
    const { count: memberCount } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', plan.group_id)
    const { data: allVotes } = await supabase.from('member_votes').select('vote').eq('item_id', item_id)
    
    if (memberCount && allVotes && allVotes.length === memberCount && memberCount > 0) {
      const upvotes = allVotes.filter(v => v.vote === 'up').length
      const downvotes = allVotes.filter(v => v.vote === 'down').length
      
      if (upvotes === downvotes) {
        // We have a tie! Run tie-breaker
        const { data: item } = await supabase.from('itinerary_items').select('*').eq('id', item_id).single()
        if (item) {
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
              console.error("Geocoding failed for tie-breaker:", err)
            }

            await supabase
              .from('itinerary_items')
              .update({
                title: `[Tie-Breaker] ${newItemData.title}`,
                description: newItemData.description,
                location_name: newItemData.location_name,
                lat: lat,
                lng: lng,
                category: newItemData.category,
                duration_minutes: newItemData.duration_minutes,
                estimated_cost: newItemData.estimated_cost
              })
              .eq('id', item_id)

            // Reset votes
            await supabase.from('member_votes').delete().eq('item_id', item_id)
          } catch (e) {
            console.error("Auto tie-breaker error:", e)
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
