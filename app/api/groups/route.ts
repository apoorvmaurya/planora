import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Fetch groups where user is a member
  const { data, error } = await supabase
    .from("group_members")
    .select(`
      group_id,
      groups:groups(*)
    `)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  const groups = data?.map((row: any) => row.groups) || []
  return NextResponse.json(groups)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, cover_image_url, member_ids } = await req.json()
  if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 })

  // 1. Create the group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name,
      description,
      cover_image_url,
      created_by: user.id
    })
    .select()
    .single()

  if (groupError || !group) return NextResponse.json({ error: groupError?.message || "Failed to create group" }, { status: 500 })

  // 2. Add members including the creator as 'admin'
  const membersToInsert = [
    { group_id: group.id, user_id: user.id, role: 'admin' }
  ]
  
  if (Array.isArray(member_ids)) {
    for (const memberId of member_ids) {
      if (memberId !== user.id) {
        membersToInsert.push({ group_id: group.id, user_id: memberId, role: 'member' })
      }
    }
  }

  const { error: membersError } = await supabase
    .from("group_members")
    .insert(membersToInsert)

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })

  return NextResponse.json(group)
}
