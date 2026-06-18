import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObject } from 'ai'
import { z } from 'zod'
import { getPlanAccess } from "@/lib/security/access"
import { AI_MODELS } from "@/lib/ai/models"
import { rateLimit } from "@/lib/security/rateLimiter"

export const maxDuration = 60



export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Apply Centralized Rate Limiting
    const rateLimitResult = await rateLimit({
      userId: user.id,
      endpoint: `/api/plans/[planId]/expenses/scan`,
      limit: 1,
      windowMs: 15000
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait 15 seconds before scanning another receipt." },
        { status: 429 }
      )
    }

    // Verify user is in the group/trip using centralized plan access checker
    const { isAuthorized, plan } = await getPlanAccess(supabase, planId, user.id)

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access to plan expenses" }, { status: 403 })
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
    const { object } = await generateObject({
      model: AI_MODELS.structured,
      schema: z.object({
        merchant: z.string().describe("The name of the merchant/store"),
        total: z.number().describe("Total amount of the transaction"),
        currency: z.string().describe("The currency code if found, e.g. USD, EUR, INR. Otherwise default empty."),
        description: z.string().describe("A summary of items purchased or description"),
        date: z.string().describe("The date of the transaction if found in ISO format (YYYY-MM-DD), otherwise empty string"),
        suggestedSplits: z.array(
          z.object({
            itemName: z.string().describe("Name of the item on the receipt"),
            cost: z.number().describe("Cost of the item")
          })
        )
      }),
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Perform high-fidelity OCR scanning on this receipt image. Extract: merchant name, total amount, transaction date, and currency. Identify individual items for optional group splits.` 
            },
            {
              type: 'image',
              image: `data:${file.type};base64,${base64Image}`
            }
          ]
        }
      ]
    })

    return NextResponse.json({ success: true, receipt: object })

  } catch (error: any) {
    console.error("AI OCR Receipt scanning error:", error)
    return NextResponse.json({ error: error.message || "Failed to scan receipt" }, { status: 500 })
  }
}
