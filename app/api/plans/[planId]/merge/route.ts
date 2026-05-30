import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { forwardGeocode } from "@/lib/locationiq/geocode"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { title, items } = await req.json()
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items parameter" }, { status: 400 })
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('destination_name')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (title) {
      await supabase.from('plans').update({ title }).eq('id', planId)
    }

    // Geocode and prep items for insertion
    const itemsToInsert = []
    let sortOrderCounter: Record<number, number> = {}

    for (const item of items) {
      let lat = item.lat
      let lng = item.lng

      const dayNum = item.day_number || 1
      if (sortOrderCounter[dayNum] === undefined) {
        sortOrderCounter[dayNum] = 0
      }

      // Geocode if missing coordinates or coordinates are zero
      const hasValidCoords = lat && lng && Math.abs(lat) > 0.001 && Math.abs(lng) > 0.001
      if (!hasValidCoords) {
        try {
          const coords = await forwardGeocode(item.location_name, plan.destination_name)
          if (coords) {
            lat = coords.lat
            lng = coords.lng
          }
        } catch (err) {
          console.error("Geocoding failed during merge for venue:", item.location_name, err)
        }
      }

      itemsToInsert.push({
        plan_id: planId,
        day_number: dayNum,
        time_of_day: item.time_of_day,
        title: item.title,
        description: item.description,
        location_name: item.location_name,
        lat: lat || 0,
        lng: lng || 0,
        category: item.category || 'activity',
        duration_minutes: item.duration_minutes || 60,
        estimated_cost: item.estimated_cost || 0,
        sort_order: sortOrderCounter[dayNum]++
      })
    }

    // Overwrite the itinerary items cleanly
    const { error: deleteError } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('plan_id', planId)

    if (deleteError) throw deleteError

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('itinerary_items')
        .insert(itemsToInsert)

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Merge itinerary error:", error)
    return NextResponse.json({ error: error.message || "Failed to merge itinerary" }, { status: 500 })
  }
}
