import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPlanAccess } from "@/lib/security/access"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { isAuthorized, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  if (!isAuthorized) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const body = await req.json()
  const allowedFields = ['title', 'description', 'start_date', 'end_date', 'budget_total', 'currency', 'status']
  const updates: Record<string, any> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { isAdmin, plan } = await getPlanAccess(supabase, planId, user.id)
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  if (!isAdmin) return NextResponse.json({ error: "Only admins can delete plans" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const permanent = searchParams.get('permanent') === 'true'

  if (permanent) {
    // Hard delete — cascading FKs will clean up itinerary_items, votes, etc.
    const { error } = await supabase.from('plans').delete().eq('id', planId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Soft delete — set status to cancelled
    const { error } = await supabase
      .from('plans')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', planId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
