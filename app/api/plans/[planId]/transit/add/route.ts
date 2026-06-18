import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { forwardGeocode } from "@/lib/locationiq/geocode"
import { getPlanAccess } from "@/lib/security/access"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { isAuthorized, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  if (!isAuthorized) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const { title, details, cost, type, day_number } = await req.json()
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

  // Get the max sort_order for the target day
  const { data: existingItems } = await supabase
    .from("itinerary_items")
    .select("sort_order")
    .eq("plan_id", planId)
    .eq("day_number", day_number || 1)
    .order("sort_order", { ascending: false })
    .limit(1)

  const nextSort = (existingItems?.[0]?.sort_order || 0) + 1

  // Map transit type to a time-of-day label
  const timeLabel = day_number === 0 ? "Pre-trip" : "Morning"

  // Geocode the destination terminal
  let lat = 0
  let lng = 0
  let resolvedLocationName = type === "flight" ? "Airport" : type === "train" ? "Train Station" : "Transit"

  // Extract destination terminal name (e.g. "Paris to Rome Gare de Lyon" -> "Rome Gare de Lyon")
  let query = ""
  const toIndex = title.toLowerCase().lastIndexOf(" to ")
  if (toIndex !== -1) {
    query = title.substring(toIndex + 4).trim()
  } else {
    query = title
  }

  if (query) {
    try {
      const destination = plan.destination_name
      
      let coords = await forwardGeocode(query, destination)
      if (!coords && destination) {
        coords = await forwardGeocode(`${query}, ${destination}`)
      }
      
      if (coords) {
        lat = coords.lat
        lng = coords.lng
        resolvedLocationName = coords.display_name ? coords.display_name.split(',')[0] : query
      }
    } catch (err) {
      console.error("Transit terminal geocoding failed:", err)
    }
  }

  const { data: item, error: insertError } = await supabase
    .from("itinerary_items")
    .insert({
      plan_id: planId,
      user_id: user.id,
      day_number: day_number || 1,
      time_of_day: timeLabel,
      title: `🚀 ${title}`,
      description: details || "",
      location_name: resolvedLocationName,
      category: "transit",
      duration_minutes: type === "flight" ? 180 : type === "train" ? 120 : 60,
      estimated_cost: parseFloat(cost?.replace(/[^0-9.]/g, "")) || 0,
      sort_order: nextSort,
      lat,
      lng,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ success: true, item })
}
