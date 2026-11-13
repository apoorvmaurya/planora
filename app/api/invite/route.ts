import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { z } from "zod"
import { rateLimit } from "@/lib/security/rateLimiter"

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
})

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitRes = await rateLimit({
      userId: user.id,
      endpoint: '/api/invite',
      limit: 10,
      windowMs: 60000
    })
    if (!rateLimitRes.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait before sending more invites." }, { status: 429 })
    }

    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid email" }, { status: 400 })
    }

    const { email } = parsed.data

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://planora-plum-beta.vercel.app'}/auth/callback?next=/onboarding`
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send invitation" }, { status: 500 })
  }
}
