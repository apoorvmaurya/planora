import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPushNotification } from "@/lib/push/vapid"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userIds, title, body, url } = await req.json()
    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (error) {
      console.error("Error fetching subscriptions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No push subscriptions found for target users" })
    }

    const payload = {
      title,
      body,
      icon: "/icon-192.png",
      data: { url: url || "/dashboard" }
    }

    const pushPromises = subscriptions.map(sub =>
      sendPushNotification(sub.subscription, payload)
        .catch(err => console.error(`Failed to push to user ${sub.user_id}:`, err))
    )

    await Promise.allSettled(pushPromises)

    return NextResponse.json({ success: true, sentCount: subscriptions.length })
  } catch (error: any) {
    console.error('Error sending push:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
