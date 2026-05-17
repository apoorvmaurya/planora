import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request, { params }: { params: Promise<{ planId: string, itemId: string }> }) {
  const { planId, itemId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { historyIndex } = await req.json()
  if (typeof historyIndex !== 'number') return NextResponse.json({ error: "Missing historyIndex" }, { status: 400 })

  const { data: item } = await supabase.from('itinerary_items').select('*').eq('id', itemId).single()
  if (!item || item.plan_id !== planId) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  if (!item.history || !item.history[historyIndex]) {
    return NextResponse.json({ error: "History entry not found" }, { status: 404 })
  }

  const restoredState = item.history[historyIndex]
  
  // We can choose to keep the current state in history or replace it.
  // We&apos;ll replace it and keep the history array as is for now.

  const { data: updatedItem, error } = await supabase
    .from('itinerary_items')
    .update({
      title: restoredState.title,
      description: restoredState.description,
      time_of_day: restoredState.time_of_day,
      location_name: restoredState.location_name,
      lat: restoredState.lat,
      lng: restoredState.lng,
      category: restoredState.category,
      duration_minutes: restoredState.duration_minutes,
      estimated_cost: restoredState.estimated_cost
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reset votes since the item changed back
  await supabase.from('member_votes').delete().eq('item_id', itemId)

  return NextResponse.json({ success: true, item: updatedItem })
}
