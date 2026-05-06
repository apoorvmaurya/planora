import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendPushNotification } from "@/lib/push/vapid"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: subData, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user.id)
      .single()

    if (subError || !subData) {
      return NextResponse.json({ error: "No push subscription found" }, { status: 404 })
    }

    const payload = {
      title: "Test Notification",
      body: "Push notifications are working perfectly! 🎉",
      icon: "/icon-192.png",
      data: { url: "/dashboard" }
    }

    await sendPushNotification(subData.subscription, payload)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending test push:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
