/**
 * Momentum Engine - Supabase Edge Function
 * 
 * 1. Set the secrets in Supabase:
 *    supabase secrets set GROQ_API_KEY="your-key"
 *    supabase secrets set RESEND_API_KEY="your-resend-key"
 * 2. Deploy the function:
 *    supabase functions deploy momentum-engine --no-verify-jwt
 */

// @ts-expect-error deno types
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
// @ts-expect-error deno types
import { generateNotificationCopy, generateTripRecap } from './groqCopy.ts'

// @ts-expect-error deno types
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// @ts-expect-error deno types
Deno.serve(async (req) => {
  try {
    // Check authorization (if triggered by pg_cron with service role)
    const authHeader = req.headers.get('Authorization')
    // @ts-expect-error deno types
    const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    if (authHeader !== expectedAuth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // @ts-expect-error deno types
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error deno types
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // --- PHASE 1: Handle Completed Trips ---
    const { data: expiredPlans } = await supabase
      .from('plans')
      .select('id, group_id, destination_name, start_date, end_date, currency')
      .eq('status', 'confirmed')
      .lt('end_date', new Date().toISOString())

    let recapsGenerated = 0

    if (expiredPlans && expiredPlans.length > 0) {
      for (const plan of expiredPlans) {
        // Mark as completed
        await supabase.from('plans').update({ status: 'completed' }).eq('id', plan.id)

        // Fetch data for recap
        const { data: members } = await supabase.from('group_members').select('user:profiles(full_name)').eq('group_id', plan.group_id)
        const memberNames = members?.map((m: any) => m.user.full_name).join(', ') || 'the group'

        const { data: expenses } = await supabase.from('plan_expenses').select('amount').eq('plan_id', plan.id)
        const totalSpent = expenses?.reduce((acc: number, exp: any) => acc + exp.amount, 0) || 0

        const { data: items } = await supabase.from('itinerary_items').select('title, vote_count').eq('plan_id', plan.id).order('vote_count', { ascending: false }).limit(3)
        const topItems = items?.map((i: any) => i.title).join(', ') || ''

        const days = Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24)) || 1

        const recapText = await generateTripRecap(plan.destination_name, days, memberNames, topItems, totalSpent, plan.currency || 'INR')

        await supabase.from('plans').update({ recap_text: recapText }).eq('id', plan.id)
        recapsGenerated++
      }
    }

    // --- PHASE 2: Handle Upcoming Push Notifications ---
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('id, group_id, destination_name, start_date')
      .eq('status', 'confirmed')

    if (plansError) throw plansError
    if (!plans || plans.length === 0) return new Response(JSON.stringify({ message: "No active plans", recapsGenerated }))

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let sentCount = 0

    for (const plan of plans) {
      if (!plan.start_date) continue

      const startDate = new Date(plan.start_date)
      startDate.setHours(0, 0, 0, 0)
      const diffTime = startDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let triggerType: 't30' | 't7' | 't24' | 't0' | null = null
      let optOutKey: 'opt_out_t30' | 'opt_out_t7' | 'opt_out_t24' | 'opt_out_t0' | null = null

      if (diffDays === 30) { triggerType = 't30'; optOutKey = 'opt_out_t30' }
      else if (diffDays === 7) { triggerType = 't7'; optOutKey = 'opt_out_t7' }
      else if (diffDays === 1) { triggerType = 't24'; optOutKey = 'opt_out_t24' }
      else if (diffDays === 0) { triggerType = 't0'; optOutKey = 'opt_out_t0' }

      if (!triggerType) continue

      // Fetch group members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', plan.group_id)

      if (!members || members.length === 0) continue
      const userIds = members.map((m: any) => m.user_id)

      if (!userIds || userIds.length === 0) continue

      // Fetch user emails from auth.admin
      const userEmails: Record<string, string> = {}
      for (const uid of userIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(uid)
        if (userData?.user?.email) {
          userEmails[uid] = userData.user.email
        }
      }

      if (Object.keys(userEmails).length === 0) continue

      // Fetch preferences
      const { data: prefs } = await supabase
        .from('plan_notification_preferences')
        .select('*')
        .eq('plan_id', plan.id)
        .in('user_id', userIds)

      const optOuts = new Set(
        (prefs || [])
          .filter((p: any) => p[optOutKey!])
          .map((p: any) => p.user_id)
      )

      // Generate AI copy once per plan/trigger
      const copy = await generateNotificationCopy(plan.destination_name, triggerType)

      // Send Emails via Resend
      for (const [uid, email] of Object.entries(userEmails)) {
        if (optOuts.has(uid)) continue // user opted out

        try {
          if (RESEND_API_KEY) {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: "Planora <onboarding@resend.dev>",
                to: [email],
                subject: copy.title,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #1D9E75;">${copy.title}</h1>
                    <p style="font-size: 16px; color: #333;">${copy.body}</p>
                    <p style="margin-top: 20px;">
                      <a href="https://planora-plum-beta.vercel.app/plans/${plan.id}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        View Itinerary
                      </a>
                    </p>
                  </div>
                `
              })
            })
            if (!emailRes.ok) {
              console.error(`Failed to send email to ${email}:`, await emailRes.text())
            } else {
              sentCount++
            }
          }
          
          // Log notification
          await supabase.from('notification_log').insert({
            plan_id: plan.id,
            user_id: uid,
            type: triggerType,
            message: copy.body
          })
        } catch (err) {
          console.error(`Failed to send email to user ${uid}:`, err)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sentCount, recapsGenerated }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
