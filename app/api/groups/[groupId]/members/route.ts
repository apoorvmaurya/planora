import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user_id, role = 'member' } = await req.json()
  if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 })

  // Ensure current user is an admin
  const { data: currentMember } = await supabase
    .from("group_members")
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || currentMember.role !== 'admin') {
    return NextResponse.json({ error: "Only admins can add members" }, { status: 403 })
  }

  // Add the new member
  const { data, error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id, role })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  
  if (!targetUserId) return NextResponse.json({ error: "userId is required" }, { status: 400 })

  if (targetUserId !== user.id) {
    // Current user is kicking someone else. Must be admin.
    const { data: currentMember } = await supabase
      .from("group_members")
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!currentMember || currentMember.role !== 'admin') {
      return NextResponse.json({ error: "Only admins can remove other members" }, { status: 403 })
    }
  }

  // Remove the member
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
