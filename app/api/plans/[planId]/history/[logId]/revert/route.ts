import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPlanAccess } from "@/lib/security/access"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string, logId: string }> }
) {
  const { planId, logId } = await params
  const supabase = await createClient()

  // 1. Get user and check if admin/creator
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check plan and admin status
  const { isAdmin, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  if (!isAdmin) return NextResponse.json({ error: "Only admins can revert changes" }, { status: 403 })

  // 2. Fetch the log entry
  const { data: log } = await supabase
    .from('plan_activity_logs')
    .select('*')
    .eq('id', logId)
    .single()
  if (!log || log.plan_id !== planId) return NextResponse.json({ error: "Log not found" }, { status: 404 })

  // 3. Perform reversion based on activity_type
  const payload = log.payload || {}
  const { old_item, new_item, deleted_item, promoted_item, old_parent_item } = payload

  let descriptionText = ""

  try {
    if (log.activity_type === 'ADD_ITEM') {
      // Revert add: delete the added item
      if (new_item && new_item.id) {
        const { error } = await supabase.from('itinerary_items').delete().eq('id', new_item.id)
        if (error) throw error
        descriptionText = `Reverted addition of "${new_item.title}"`
      }
    } else if (log.activity_type === 'DELETE_ITEM') {
      // Revert delete: re-insert the deleted item
      if (deleted_item) {
        const { error } = await supabase.from('itinerary_items').insert(deleted_item)
        if (error) throw error
        descriptionText = `Reverted deletion of "${deleted_item.title}"`
      }
    } else if (log.activity_type === 'UPDATE_ITEM') {
      // Revert update: restore the old item properties
      if (old_item && old_item.id) {
        const { error } = await supabase.from('itinerary_items').update(old_item).eq('id', old_item.id)
        if (error) throw error
        descriptionText = `Reverted changes to "${old_item.title}"`
      }
    } else if (log.activity_type === 'PROMOTE_ITEM') {
      // Revert promotion:
      // 1. If there was an old parent item, restore it (re-insert it)
      // 2. Demote the promoted item back to 'suggestion' and point its parent_item_id to the restored parent
      if (promoted_item) {
        if (old_parent_item) {
          // Re-insert parent item
          const { error: insertParentErr } = await supabase.from('itinerary_items').insert(old_parent_item)
          if (insertParentErr) throw insertParentErr

          // Demote item back to suggestion pointing to parent
          const { error: demoteErr } = await supabase
            .from('itinerary_items')
            .update({
              suggestion_status: 'suggestion',
              parent_item_id: old_parent_item.id
            })
            .eq('id', promoted_item.id)
          if (demoteErr) throw demoteErr
          
          descriptionText = `Reverted promotion of "${promoted_item.title}" (restored "${old_parent_item.title}")`
        } else {
          // Just demote back to suggestion
          const { error: demoteErr } = await supabase
            .from('itinerary_items')
            .update({
              suggestion_status: 'suggestion',
              parent_item_id: null
            })
            .eq('id', promoted_item.id)
          if (demoteErr) throw demoteErr
          
          descriptionText = `Reverted promotion of "${promoted_item.title}" to suggestion`
        }
      }
    } else {
      return NextResponse.json({ error: "This activity type cannot be reverted" }, { status: 400 })
    }

    // 4. Log the reversion action (by setting user_id = user.id)
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const adminName = profile?.full_name || 'Admin'
    const finalLogDescription = `${adminName} reverted change: "${log.description}"`

    await supabase.from('plan_activity_logs').insert({
      plan_id: planId,
      user_id: user.id,
      activity_type: 'REVERT_ACTION',
      description: finalLogDescription,
      payload: { reverted_log_id: logId }
    })

    return NextResponse.json({ success: true, message: descriptionText })
  } catch (err: any) {
    console.error("Reversion failed:", err)
    return NextResponse.json({ error: err.message || "Failed to revert change" }, { status: 500 })
  }
}
