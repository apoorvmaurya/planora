import { NextResponse } from "next/server"
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json()
    if (!origin || !destination) return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 })

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Suggest 3 realistic transit options to travel from ${origin} to ${destination}. Provide a mix of speed and budget if applicable. Provide cost estimates in USD.
      Output ONLY valid JSON matching this structure exactly (do not output markdown or backticks):
      {
        "options": [
          { "type": "flight" | "train" | "bus" | "driving", "title": "string", "details": "string", "cost": "string" }
        ]
      }`,
    })

    const cleanText = result.text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanText)

    return NextResponse.json(parsed)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
