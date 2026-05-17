import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  destination: z.object({ name: z.string(), lat: z.number(), lng: z.number() }),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive(),
  currency: z.string().length(3),
  groupId: z.string(),
  preferences: z.object({
    tripType: z.string(),
    pace: z.string(),
    dietaryNotes: z.string().optional(),
    mustHaves: z.string().optional(),
    avoid: z.string().optional()
  })
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error }, { status: 400 })
  const { destination, startDate, endDate, budget, currency, groupId, preferences } = parsed.data

  // Rate Limiting (max 10 requests per minute per user)
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  const { count } = await supabase
    .from('request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('endpoint', '/api/plans/generate')
    .gte('created_at', oneMinuteAgo)

  if (count && count >= 10) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
  }

  await supabase.from('request_logs').insert({ user_id: user.id, endpoint: '/api/plans/generate' })

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      group_id: groupId === 'solo' ? null : groupId,
      title: `Trip to ${destination.name}`,
      description: `A ${preferences.pace} ${preferences.tripType} trip.`,
      destination_name: destination.name,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      start_date: startDate,
      end_date: endDate,
      budget_total: budget,
      currency: currency,
      created_by: user.id,
      status: 'draft'
    })
    .select()
    .single()

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 })
  }

  return NextResponse.json({ planId: plan.id })
}
