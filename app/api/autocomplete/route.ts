import { NextResponse } from "next/server"
import { autocomplete } from "@/lib/locationiq/geocode"

export async function GET(req: Request) {
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
    return NextResponse.json({ error: err.message || "Failed to fetch autocomplete suggestions" }, { status: 550 })
  }
}
