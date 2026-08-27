import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCoordinatesForLocation } from "@/lib/locationiq/geocode"
import { reorderDayItems } from "@/lib/itinerary/sort"
import { getPlanAccess } from "@/lib/security/access"

import { z } from "zod"
import { handleApiError } from "@/lib/errors"

const itemPostSchema = z.object({
  day_number: z.number().int().min(0),
  time_of_day: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  location_name: z.string().min(1, "Location is required"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  category: z.string().optional().default("activity"),
  duration_minutes: z.number().optional().default(60),
  estimated_cost: z.number().optional().default(0),
  parent_item_id: z.string().nullable().optional(),
  is_delete_suggestion: z.boolean().optional().default(false),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rawBody = await req.json()
    const parsed = itemPostSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid item payload" }, { status: 400 })
    }

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
    } = parsed.data

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
        day_number: Number(day_number),
        time_of_day,
        title,
        description: description || "",
        location_name,
        lat,
        lng,
        category: category || "activity",
        duration_minutes: Number(duration_minutes) || 60,
        estimated_cost: Number(estimated_cost) || 0,
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
    await reorderDayItems(supabase, planId, Number(day_number))

    // Retrieve the newly sorted item with its updated sort_order
    const { data: reorderedItem } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("id", item.id)
      .single()

    return NextResponse.json({ success: true, item: reorderedItem || item })

  } catch (err: unknown) {
    const message = handleApiError(err, "Failed to create item")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
