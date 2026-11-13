import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObject } from 'ai'
import { z } from 'zod'
import { AI_MODELS } from "@/lib/ai/models"
import { getPlanAccess } from "@/lib/security/access"
import { rateLimit } from "@/lib/security/rateLimiter"

const transitSchema = z.object({
  options: z.array(
    z.object({
      type: z.enum(['flight', 'train', 'bus', 'driving']),
      title: z.string(),
      details: z.string(),
      cost: z.string()
    })
  )
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAuthorized, plan } = await getPlanAccess(supabase, planId, user.id)
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    if (!isAuthorized) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const origin = searchParams.get('city') || searchParams.get('origin')
    if (!origin) {
      return NextResponse.json({ error: "Origin city is required" }, { status: 400 })
    }

    const destination = searchParams.get('destination') || plan.destination_name || "Destination"

    // Rate limit
    const rateLimitRes = await rateLimit({
      userId: user.id,
      endpoint: '/api/plans/[planId]/transit',
      limit: 20,
      windowMs: 60000
    })
    if (!rateLimitRes.success) {
      return NextResponse.json({ error: "Too many transit requests. Please wait a minute." }, { status: 429 })
    }

    const { object } = await generateObject({
      model: AI_MODELS.structured,
      schema: transitSchema,
      prompt: `Suggest 3 realistic transit options to travel from ${origin} to ${destination}. Provide a mix of speed and budget if applicable. Provide cost estimates in USD.`,
      abortSignal: req.signal,
    })

    return NextResponse.json(object)
  } catch (error: any) {
    console.error("Transit suggestion error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate transit options" }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAuthorized, plan } = await getPlanAccess(supabase, planId, user.id)
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    if (!isAuthorized) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const body = await req.json()
    const origin = body.origin || body.city
    const destination = body.destination || plan.destination_name || "Destination"

    if (!origin) {
      return NextResponse.json({ error: "Missing origin" }, { status: 400 })
    }

    // Rate limit
    const rateLimitRes = await rateLimit({
      userId: user.id,
      endpoint: '/api/plans/[planId]/transit',
      limit: 20,
      windowMs: 60000
    })
    if (!rateLimitRes.success) {
      return NextResponse.json({ error: "Too many transit requests. Please wait a minute." }, { status: 429 })
    }

    const { object } = await generateObject({
      model: AI_MODELS.structured,
      schema: transitSchema,
      prompt: `Suggest 3 realistic transit options to travel from ${origin} to ${destination}. Provide a mix of speed and budget if applicable. Provide cost estimates in USD.`,
      abortSignal: req.signal,
    })

    return NextResponse.json(object)
  } catch (error: any) {
    console.error("Transit suggestion error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate transit options" }, { status: 500 })
  }
}
