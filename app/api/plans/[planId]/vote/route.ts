import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { item_id, vote } = await req.json()
  if (!item_id || !vote) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  const { data: existingVote } = await supabase
    .from('member_votes')
    .select('id, vote')
    .eq('item_id', item_id)
    .eq('user_id', user.id)
    .single()

  if (existingVote) {
    if (existingVote.vote === vote) {
      const { error } = await supabase.from('member_votes').delete().eq('id', existingVote.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase.from('member_votes').update({ vote }).eq('id', existingVote.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabase.from('member_votes').insert({
      plan_id: planId,
      item_id,
      user_id: user.id,
      vote
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
