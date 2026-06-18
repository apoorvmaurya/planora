import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendPushNotification } from "@/lib/push/vapid"
import { getPlanAccess } from "@/lib/security/access"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify plan exists and user is admin
    const { isAdmin, plan } = await getPlanAccess(supabase, planId, user.id)

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can confirm plans" }, { status: 403 })
    }

    // 2. Update Plan Status
    const { error: updateError } = await supabase
      .from("plans")
      .update({ status: "confirmed" })
      .eq("id", planId)

    if (updateError) throw updateError

    // 3. Send Push Notifications to everyone in the group (skip for solo plans)
    if (plan.group_id) {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", plan.group_id)

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id)
        
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .in("user_id", userIds)

        if (subscriptions && subscriptions.length > 0) {
          const payload = {
            title: "Plan Confirmed! 🎉",
            body: `The trip to ${plan.destination_name} is officially locked in! Pack your bags!`,
            icon: "/icon-192.png",
            data: { url: `/plans/${plan.id}` }
          }

          const pushPromises = subscriptions.map(sub => 
            sendPushNotification(sub.subscription, payload)
              .catch(err => console.error(`Failed to push to user ${sub.user_id}:`, err))
          )
          
          // Fire and forget so we don't block the response
          Promise.allSettled(pushPromises)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Confirmation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
