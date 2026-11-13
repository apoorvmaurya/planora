import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { rateLimit } from "@/lib/security/rateLimiter"

const updateProfileSchema = z.object({
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  full_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
  travel_preferences: z.record(z.string(), z.any()).optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitRes = await rateLimit({
      userId: user.id,
      endpoint: '/api/profile',
      limit: 30,
      windowMs: 60000
    })
    if (!rateLimitRes.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 })
    }

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile data" }, { status: 400 })
    }

    const updates: Record<string, any> = {
      ...parsed.data,
      updated_at: new Date().toISOString()
    }

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: updatedProfile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 })
  }
}
