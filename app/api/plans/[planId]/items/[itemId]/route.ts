import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { forwardGeocode } from "@/lib/locationiq/geocode"

export async function PATCH(req: Request, { params }: { params: Promise<{ planId: string, itemId: string }> }) {
  const { planId, itemId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const updates = await req.json()

  // Ensure the user has access to the plan
  const { data: item } = await supabase.from('itinerary_items').select('*').eq('id', itemId).single()
  if (!item || item.plan_id !== planId) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  let lat = item.lat
  let lng = item.lng

  if (updates.location_name && updates.location_name !== item.location_name) {
    try {
      const { data: plan } = await supabase.from('plans').select('destination_name').eq('id', planId).single()
      const coords = await forwardGeocode(updates.location_name, plan?.destination_name)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
      }
    } catch (err) {
      console.error("Geocoding failed for manual item edit route:", err)
    }
  }

  // RLS will ensure only authorized members can update
  const { data: updatedItem, error } = await supabase
    .from('itinerary_items')
    .update({
      title: updates.title,
      description: updates.description,
      time_of_day: updates.time_of_day,
      location_name: updates.location_name,
      duration_minutes: updates.duration_minutes,
      estimated_cost: updates.estimated_cost,
      lat,
      lng
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, item: updatedItem })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ planId: string, itemId: string }> }
) {
  const { planId, itemId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: item } = await supabase.from('itinerary_items').select('*').eq('id', itemId).single()
  if (!item || item.plan_id !== planId) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
