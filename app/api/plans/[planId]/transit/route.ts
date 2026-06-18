import { NextResponse } from "next/server"
import { generateObject } from 'ai'
import { z } from 'zod'
import { AI_MODELS } from "@/lib/ai/models"

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json()
    if (!origin || !destination) return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 })

    const { object } = await generateObject({
      model: AI_MODELS.structured,
      schema: z.object({
        options: z.array(
          z.object({
            type: z.enum(['flight', 'train', 'bus', 'driving']),
            title: z.string(),
            details: z.string(),
            cost: z.string()
          })
        )
      }),
      prompt: `Suggest 3 realistic transit options to travel from ${origin} to ${destination}. Provide a mix of speed and budget if applicable. Provide cost estimates in USD.`,
    })

    return NextResponse.json(object)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
