import { NextResponse } from "next/server"
import { autocomplete } from "@/lib/locationiq/geocode"
import { rateLimit } from "@/lib/security/rateLimiter"

export async function GET(req: Request) {
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  
  const rateLimitRes = await rateLimit({
    ipAddress,
    endpoint: '/api/autocomplete',
    limit: 60,
    windowMs: 60000
  })

  if (!rateLimitRes.success) {
    return NextResponse.json({ error: "Too many autocomplete requests. Please slow down." }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ""

  if (q.length < 2) {
    return NextResponse.json([])
  }

  try {
    const results = await autocomplete(q)
    return NextResponse.json(results)
  } catch (err: any) {
    console.error("[Autocomplete Proxy] Request failed:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch autocomplete suggestions" }, { status: 500 })
  }
}
