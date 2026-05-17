import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ planId: string, itemId: string }> }) {
  const { planId, itemId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const updates = await req.json()

  // Ensure the user has access to the plan
  const { data: item } = await supabase.from('itinerary_items').select('plan_id').eq('id', itemId).single()
  if (!item || item.plan_id !== planId) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  // RLS will ensure only authorized members can update
  const { data: updatedItem, error } = await supabase
    .from('itinerary_items')
    .update({
      title: updates.title,
      description: updates.description,
      time_of_day: updates.time_of_day,
      location_name: updates.location_name,
      duration_minutes: updates.duration_minutes,
      estimated_cost: updates.estimated_cost
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, item: updatedItem })
}
