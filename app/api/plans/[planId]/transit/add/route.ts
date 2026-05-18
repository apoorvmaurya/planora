import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const { data: item, error: insertError } = await supabase
    .from("itinerary_items")
    .insert({
      plan_id: planId,
      day_number: day_number || 1,
      time_of_day: timeLabel,
      title: `🚀 ${title}`,
      description: details || "",
      location_name: type === "flight" ? "Airport" : type === "train" ? "Train Station" : "Transit",
      category: "transit",
      duration_minutes: type === "flight" ? 180 : type === "train" ? 120 : 60,
      estimated_cost: parseFloat(cost?.replace(/[^0-9.]/g, "")) || 0,
      sort_order: nextSort,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ success: true, item })
}
