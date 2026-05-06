/**
 * Momentum Engine - Supabase Edge Function
 * 
 * Deployment Instructions:
 * 1. Generate a new Web Push VAPID keypair if you don't have one.
 * 2. Set the secrets in Supabase:
 *    supabase secrets set GOOGLE_GENERATIVE_AI_API_KEY="your-key"
 *    supabase secrets set VAPID_PUBLIC_KEY="your-public"
 *    supabase secrets set VAPID_PRIVATE_KEY="your-private"
 * 3. Deploy the function:
 *    supabase functions deploy momentum-engine --no-verify-jwt
 */

// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
// @ts-ignore
import webpush from 'npm:web-push@3.6.7'
// @ts-ignore
import { generateNotificationCopy, generateTripRecap } from './geminiCopy.ts'

webpush.setVapidDetails(
  'mailto:support@planora.app',
  // @ts-ignore
  Deno.env.get('VAPID_PUBLIC_KEY') || '',
  // @ts-ignore
  Deno.env.get('VAPID_PRIVATE_KEY') || ''
)

// @ts-ignore
Deno.serve(async (req) => {
  try {
    // Check authorization (if triggered by pg_cron with service role)
    const authHeader = req.headers.get('Authorization')
    // @ts-ignore
    const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    if (authHeader !== expectedAuth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore
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

      // Fetch push subscriptions for those members
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', userIds)

      if (!subscriptions || subscriptions.length === 0) continue

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
      const payload = { ...copy, icon: '/icon-192.png', data: { url: `/plans/${plan.id}` } }

      // Send pushes
      for (const subRecord of subscriptions) {
        if (optOuts.has(subRecord.user_id)) continue // user opted out

        try {
          await webpush.sendNotification(subRecord.subscription, JSON.stringify(payload))
          sentCount++
          
          // Log notification
          await supabase.from('notification_log').insert({
            plan_id: plan.id,
            user_id: subRecord.user_id,
            type: triggerType
          })
        } catch (err) {
          console.error(`Failed to send push to user ${subRecord.user_id}:`, err)
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
