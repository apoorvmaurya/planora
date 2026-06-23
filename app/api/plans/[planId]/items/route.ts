import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCoordinatesForLocation } from "@/lib/locationiq/geocode"
import { reorderDayItems } from "@/lib/itinerary/sort"
import { getPlanAccess } from "@/lib/security/access"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { 
      day_number, 
      time_of_day, 
      title, 
      description, 
      location_name, 
      lat: customLat,
      lng: customLng,
      category, 
      duration_minutes, 
      estimated_cost,
      parent_item_id,
      is_delete_suggestion
    } = await req.json()

    if (!title || !location_name || !day_number || !time_of_day) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify plan access and roles
    const { isAuthorized, isAdmin, plan } = await getPlanAccess(supabase, planId, user.id)
    if (!isAuthorized || !plan) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const suggestion_status = (isAdmin || !plan.group_id) ? "approved" : "suggestion"

    // Get max sort_order for the target day
    const { data: existingItems } = await supabase
      .from("itinerary_items")
      .select("sort_order")
      .eq("plan_id", planId)
      .eq("day_number", day_number)
      .order("sort_order", { ascending: false })
      .limit(1)

    const nextSort = (existingItems?.[0]?.sort_order || 0) + 1

    // Geocode location using centralized coordinates helper if not supplied by client
    let lat = customLat
    let lng = customLng
    if (lat === undefined || lng === undefined || (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001)) {
      const coords = await getCoordinatesForLocation(location_name, plan.destination_name)
      lat = coords.lat
      lng = coords.lng
    }

    // Insert new item
    const { data: item, error: insertError } = await supabase
      .from("itinerary_items")
      .insert({
        plan_id: planId,
        day_number: parseInt(day_number),
        time_of_day,
        title,
        description: description || "",
        location_name,
        lat,
        lng,
        category: category || "activity",
        duration_minutes: parseInt(duration_minutes) || 60,
        estimated_cost: parseFloat(estimated_cost) || 0,
        sort_order: nextSort,
        suggestion_status,
        parent_item_id: parent_item_id || null,
        created_by: user.id,
        is_delete_suggestion: !!is_delete_suggestion
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Sort all items for this day chronologically and logically
    await reorderDayItems(supabase, planId, parseInt(day_number))

    // Retrieve the newly sorted item with its updated sort_order
    const { data: reorderedItem } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("id", item.id)
      .single()

    return NextResponse.json({ success: true, item: reorderedItem || item })

  } catch (err: any) {
    console.error("Failed to manually create itinerary item:", err)
    return NextResponse.json({ error: err.message || "Failed to create item" }, { status: 500 })
  }
}
