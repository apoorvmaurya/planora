import { NextResponse } from "next/server"
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json()
    if (!origin || !destination) return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 })

    const result = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: z.object({
        options: z.array(z.object({
          type: z.enum(['flight', 'train', 'bus', 'driving']),
          title: z.string(),
          details: z.string(),
          cost: z.string()
        }))
      }),
      prompt: `Suggest 3 realistic transit options to travel from ${origin} to ${destination}. Provide a mix of speed and budget if applicable. Provide cost estimates in USD.`,
    })

    return NextResponse.json(result.object)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
