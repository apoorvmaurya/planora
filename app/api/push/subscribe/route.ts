import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await req.json()

    // Upsert the push subscription
    // Because push_subscriptions has a UNIQUE constraint on user_id, 
    // we can use upsert or just delete and insert to ensure only the latest device is active (or store multiple if we change schema).
    // The schema specifies user_id is UNIQUE.
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription
      }, { onConflict: 'user_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving push subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
