import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { invite_code } = await req.json()
  if (!invite_code) return NextResponse.json({ error: "Invite code is required" }, { status: 400 })

  // Find the group by invite code
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", invite_code)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 })
  }

  // Check if user is already a member
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: "You are already a member of this group", groupId: group.id }, { status: 409 })
  }

  // Add user as member
  const { error: joinError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "member" })

  if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })

  return NextResponse.json({ success: true, groupId: group.id, groupName: group.name })
}
