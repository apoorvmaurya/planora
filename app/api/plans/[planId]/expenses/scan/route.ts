import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { safeJsonParse } from "@/lib/utils/jsonParser"

export const maxDuration = 60

// In-memory sliding window rate-limiter (15-second cooldown per user to prevent Groq free-tier 429s)
const rateLimitStore = new Map<string, number>()
const COOLDOWN_MS = 15000

function checkRateLimit(userId: string): { limited: boolean; retryAfter: number } {
  const now = Date.now()
  const lastRequest = rateLimitStore.get(userId)
  if (lastRequest && (now - lastRequest) < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - lastRequest)) / 1000)
    return { limited: true, retryAfter }
  }
  rateLimitStore.set(userId, now)
  return { limited: false, retryAfter: 0 }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Apply Rate Limiting
    const limitCheck = checkRateLimit(user.id)
    if (limitCheck.limited) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${limitCheck.retryAfter} seconds before scanning another receipt.` },
        { status: 429 }
      )
    }

    // Verify user is in the group/trip
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, group_id, created_by")
      .eq("id", planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (plan.group_id) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", plan.group_id)
        .eq("user_id", user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else {
      if (plan.created_by !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Parse image from multipart/form-data
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')

    // Call Groq Vision using Vercel AI SDK
    const { text } = await generateText({
      model: groq('llama-3.2-11b-vision-preview'),
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Perform high-fidelity OCR scanning on this receipt image. Extract: merchant name, total amount, transaction date, and currency. Identify individual items for optional group splits.
Return the output strictly as a JSON object adhering to this schema:
{
  "merchant": "The name of the merchant/store",
  "total": number,
  "currency": "The currency code if found, e.g. USD, EUR, INR. Otherwise default empty.",
  "description": "A summary of items purchased or description",
  "date": "The date of the transaction if found in ISO format (YYYY-MM-DD), otherwise empty string",
  "suggestedSplits": [
    {
      "itemName": "Name of the item on the receipt",
      "cost": number
    }
  ]
}` 
            },
            {
              type: 'image',
              image: `data:${file.type};base64,${base64Image}`
            }
          ]
        }
      ]
    })

    const object = safeJsonParse(text)

    return NextResponse.json({ success: true, receipt: object })

  } catch (error: any) {
    console.error("AI OCR Receipt scanning error:", error)
    return NextResponse.json({ error: error.message || "Failed to scan receipt" }, { status: 500 })
  }
}
