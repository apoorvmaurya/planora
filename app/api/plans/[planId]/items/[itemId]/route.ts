import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCoordinatesForLocation } from "@/lib/locationiq/geocode"
import { reorderDayItems } from "@/lib/itinerary/sort"
import { getPlanAccess } from "@/lib/security/access"

export async function PATCH(req: Request, { params }: { params: Promise<{ planId: string, itemId: string }> }) {
  const { planId, itemId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const updates = await req.json()

  // Fetch the item
  const { data: item } = await supabase.from('itinerary_items').select('*').eq('id', itemId).single()
  if (!item || item.plan_id !== planId) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  // Verify plan access and roles
  const { isAuthorized, isAdmin, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!isAuthorized || !plan) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  // Determine if this is a direct update or a suggestion insertion
  const isSuggestionUpdate = item.suggestion_status === 'suggestion' && item.created_by === user.id
  const isDirectUpdateAllowed = isAdmin || !plan.group_id || isSuggestionUpdate

  if (isDirectUpdateAllowed) {
    let lat = updates.lat !== undefined ? updates.lat : item.lat
    let lng = updates.lng !== undefined ? updates.lng : item.lng

    if (updates.location_name && updates.location_name !== item.location_name && updates.lat === undefined) {
      const coords = await getCoordinatesForLocation(updates.location_name, plan.destination_name)
      lat = coords.lat
      lng = coords.lng
    }

    const updatesPayload: Record<string, any> = {
      title: updates.title !== undefined ? updates.title : item.title,
      description: updates.description !== undefined ? updates.description : item.description,
      time_of_day: updates.time_of_day !== undefined ? updates.time_of_day : item.time_of_day,
      location_name: updates.location_name !== undefined ? updates.location_name : item.location_name,
      duration_minutes: updates.duration_minutes !== undefined ? updates.duration_minutes : item.duration_minutes,
      estimated_cost: updates.estimated_cost !== undefined ? updates.estimated_cost : item.estimated_cost,
      lat,
      lng
    }

    // Admins can manually set suggestion_status (e.g. approve/reject)
    if (isAdmin && updates.suggestion_status) {
      updatesPayload.suggestion_status = updates.suggestion_status

      // If we are approving a suggestion, handle replacing the parent or deleting:
      if (updates.suggestion_status === 'approved' && item.suggestion_status === 'suggestion') {
        if (item.is_delete_suggestion) {
          if (item.parent_item_id) {
            await supabase.from('itinerary_items').delete().eq('id', item.parent_item_id)
          }
          await supabase.from('itinerary_items').delete().eq('id', itemId)
          return NextResponse.json({ success: true, deleted: true })
        } else if (item.parent_item_id) {
          await supabase.from('itinerary_items').delete().eq('id', item.parent_item_id)
          updatesPayload.parent_item_id = null
          updatesPayload.title = updatesPayload.title.replace('[Tie-Breaker]', '').replace('[Delete Proposal]', '').trim()
        }
      }
    }

    const { data: updatedItem, error } = await supabase
      .from('itinerary_items')
      .update(updatesPayload)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort all items for this day chronologically and logically
    await reorderDayItems(supabase, planId, item.day_number)

    // Retrieve the newly sorted item with its updated sort_order
    const { data: reorderedItem } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("id", itemId)
      .single()

    return NextResponse.json({ success: true, item: reorderedItem || updatedItem })
  } else {
    // Intercept: Propose an alternative suggestion instead of modifying the official item directly
    let lat = updates.lat !== undefined ? updates.lat : item.lat
    let lng = updates.lng !== undefined ? updates.lng : item.lng

    const locationName = updates.location_name !== undefined ? updates.location_name : item.location_name
    if (updates.location_name && updates.location_name !== item.location_name && updates.lat === undefined) {
      const coords = await getCoordinatesForLocation(locationName, plan.destination_name)
      lat = coords.lat
      lng = coords.lng
    }

    const { data: proposedItem, error } = await supabase
      .from('itinerary_items')
      .insert({
        plan_id: planId,
        day_number: item.day_number,
        time_of_day: updates.time_of_day !== undefined ? updates.time_of_day : item.time_of_day,
        title: updates.title !== undefined ? updates.title : item.title,
        description: updates.description !== undefined ? updates.description : item.description,
        location_name: locationName,
        lat,
        lng,
        category: item.category,
        duration_minutes: updates.duration_minutes !== undefined ? updates.duration_minutes : item.duration_minutes,
        estimated_cost: updates.estimated_cost !== undefined ? updates.estimated_cost : item.estimated_cost,
        sort_order: item.sort_order,
        suggestion_status: 'suggestion',
        parent_item_id: itemId,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reorder day items for consistency
    await reorderDayItems(supabase, planId, item.day_number)

    return NextResponse.json({ success: true, item: proposedItem, proposed: true })
  }
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

  // Verify plan access and roles
  const { isAuthorized, isAdmin, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!isAuthorized || !plan) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  // Determine if direct deletion is allowed
  const isSuggestionOwner = item.suggestion_status === 'suggestion' && item.created_by === user.id
  const isDirectDeleteAllowed = isAdmin || !plan.group_id || isSuggestionOwner

  if (isDirectDeleteAllowed) {
    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reorder remaining items logically
    await reorderDayItems(supabase, planId, item.day_number)

    return NextResponse.json({ success: true })
  } else {
    // Intercept: Propose a delete suggestion instead of deleting the official item
    const { data: proposedDelete, error } = await supabase
      .from('itinerary_items')
      .insert({
        plan_id: planId,
        day_number: item.day_number,
        time_of_day: item.time_of_day,
        title: `[Delete Proposal] ${item.title}`,
        description: `Proposal to remove this activity from the itinerary.`,
        location_name: item.location_name,
        lat: item.lat,
        lng: item.lng,
        category: item.category,
        duration_minutes: item.duration_minutes,
        estimated_cost: item.estimated_cost,
        sort_order: item.sort_order,
        suggestion_status: 'suggestion',
        parent_item_id: itemId,
        is_delete_suggestion: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 550 })
    }

    // Reorder items logically
    await reorderDayItems(supabase, planId, item.day_number)

    return NextResponse.json({ success: true, item: proposedDelete, proposed: true })
  }
}
