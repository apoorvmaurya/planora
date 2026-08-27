import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObject } from 'ai'
import { getCoordinatesForLocation } from "@/lib/locationiq/geocode"
import { reorderDayItems } from "@/lib/itinerary/sort"
import { z } from 'zod'
import { getPlanAccess } from "@/lib/security/access"
import { AI_MODELS } from "@/lib/ai/models"
import { voteSchema } from "@/lib/validations/api"

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { isAuthorized, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  if (!isAuthorized) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const body = await req.json()
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid vote input" }, { status: 400 })
  }
  const { item_id, vote } = parsed.data

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

  // Check for election / auto tie-breaker
  if (plan) {
    const { data: existingItems } = await supabase
      .from('itinerary_items')
      .select('title, location_name')
      .eq('plan_id', planId)

    const forbidList = existingItems?.map((i: any) => `- "${i.title}" at ${i.location_name}`).join('\n') || "None"

    const { count: memberCount } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', plan.group_id)
    const { data: allVotes } = await supabase.from('member_votes').select('vote').eq('item_id', item_id)
    
    if (memberCount && allVotes && allVotes.length === memberCount && memberCount > 0) {
      const upvotes = allVotes.filter(v => v.vote === 'up').length
      const downvotes = allVotes.filter(v => v.vote === 'down').length
      
      const { data: item } = await supabase.from('itinerary_items').select('*').eq('id', item_id).single()
      if (item) {
        const isSuggestion = item.suggestion_status === 'suggestion'

        if (isSuggestion) {
          if (upvotes > downvotes) {
            // Suggestion wins! Promote to official itinerary
            if (item.is_delete_suggestion) {
              if (item.parent_item_id) {
                await supabase.from('itinerary_items').delete().eq('id', item.parent_item_id)
              }
              await supabase.from('itinerary_items').delete().eq('id', item.id)
            } else if (item.parent_item_id) {
              await supabase.from('itinerary_items').delete().eq('id', item.parent_item_id)
              await supabase.from('itinerary_items').update({
                suggestion_status: 'approved',
                parent_item_id: null,
                title: item.title.replace('[Tie-Breaker]', '').replace('[Delete Proposal]', '').trim()
              }).eq('id', item.id)
            } else {
              await supabase.from('itinerary_items').update({
                suggestion_status: 'approved'
              }).eq('id', item.id)
            }
            // Clear votes
            await supabase.from('member_votes').delete().eq('item_id', item_id)
          } else if (downvotes > upvotes) {
            // Suggestion loses! Reject and delete suggestion
            await supabase.from('itinerary_items').delete().eq('id', item.id)
            await supabase.from('member_votes').delete().eq('item_id', item_id)
          } else {
            // We have a tie! Run AI tie-breaker
            try {
              const { object: newItemData } = await generateObject({
                model: AI_MODELS.structured,
                providerOptions: {
                  groq: {
                    structuredOutputs: false,
                  },
                },
                schema: z.object({
                  title: z.string(),
                  description: z.string(),
                  time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
                  location_name: z.string(),
                  category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
                  duration_minutes: z.number(),
                  estimated_cost: z.number()
                }),
                prompt: `You are an expert travel planner AI for Planora.
The group is traveling to ${plan.destination_name}.
They previously had a suggested itinerary item for ${item.time_of_day}:
Title: ${item.title}
Description: ${item.description}
Cost: ${item.estimated_cost} ${plan.currency}

We need to generate a SINGLE alternative itinerary item that fits the same time of day (${item.time_of_day}) and similar budget.

CRITICAL NEGATIVE CONSTRAINTS (DEDUPLICATION):
The alternative item MUST NOT be any of the following items that are already scheduled on the itinerary:
${forbidList}

Please generate an alternative suggested item that is completely different and distinct from "${item.title}" and all items in the forbid list above. Format your response strictly as a JSON object adhering to the schema.`,
              })

              const { lat, lng } = await getCoordinatesForLocation(newItemData.location_name, plan?.destination_name)

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
              console.error("Auto tie-breaker error on suggestion:", e)
            }
          }
        } else {
          // Voted on official/approved item
          if (downvotes > upvotes) {
            // Rejected! Remove official item from itinerary
            await supabase.from('itinerary_items').delete().eq('id', item.id)
            await supabase.from('member_votes').delete().eq('item_id', item_id)
          } else if (upvotes > downvotes) {
            // Approved! Keep item and clear votes
            await supabase.from('member_votes').delete().eq('item_id', item_id)
          } else {
            // We have a tie! Run AI tie-breaker to replace official item
            try {
              const { object: newItemData } = await generateObject({
                model: AI_MODELS.structured,
                providerOptions: {
                  groq: {
                    structuredOutputs: false,
                  },
                },
                schema: z.object({
                  title: z.string(),
                  description: z.string(),
                  time_of_day: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
                  location_name: z.string(),
                  category: z.enum(['activity', 'food', 'transport', 'accommodation', 'leisure']),
                  duration_minutes: z.number(),
                  estimated_cost: z.number()
                }),
                prompt: `You are an expert travel planner AI for Planora.
The group is traveling to ${plan.destination_name}.
They previously had an itinerary item for ${item.time_of_day}:
Title: ${item.title}
Description: ${item.description}
Cost: ${item.estimated_cost} ${plan.currency}

We need to generate a SINGLE alternative itinerary item that fits the same time of day (${item.time_of_day}) and similar budget.

CRITICAL NEGATIVE CONSTRAINTS (DEDUPLICATION):
The alternative item MUST NOT be any of the following items that are already scheduled on the itinerary:
${forbidList}

Please generate an alternative item that is completely different and distinct from "${item.title}" and all items in the forbid list above. Format your response strictly as a JSON object adhering to the schema.`,
              })

              const { lat, lng } = await getCoordinatesForLocation(newItemData.location_name, plan?.destination_name)

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
              console.error("Auto tie-breaker error on official item:", e)
            }
          }
        }
        // Automatically sort all items for this day chronologically and logically
        await reorderDayItems(supabase, planId, item.day_number)
      }
    }
  }

  return NextResponse.json({ success: true })
}
