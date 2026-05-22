import { NextResponse } from "next/server"
import { generateObject } from 'ai'
import { z } from 'zod'
import { groq } from '@ai-sdk/groq'

const transitOptionsSchema = z.object({
  options: z.array(
    z.object({
      type: z.enum(['flight', 'train', 'bus', 'driving']),
      title: z.string().describe('Short title for the transit option'),
      details: z.string().describe('Details such as transfer stations, airlines, or highway route names'),
      cost: z.string().describe('Estimated cost string, e.g. "$150", "$30 - $50"')
    })
  )
})

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json()
    if (!origin || !destination) return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 })

    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      schema: transitOptionsSchema,
      prompt: `Suggest 3 realistic transit options to travel from ${origin} to ${destination}. Provide a mix of speed and budget if applicable. Provide cost estimates in USD.`,
    })

    return NextResponse.json(object)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
