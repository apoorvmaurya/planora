import { NextResponse } from "next/server"
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { safeJsonParse } from "@/lib/utils/jsonParser"

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json()
    if (!origin || !destination) return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 })

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Suggest 3 realistic transit options to travel from ${origin} to ${destination}. Provide a mix of speed and budget if applicable. Provide cost estimates in USD.
Return the output strictly as a JSON object adhering to this schema:
{
  "options": [
    {
      "type": "flight" | "train" | "bus" | "driving",
      "title": "Short title for the transit option",
      "details": "Details such as transfer stations, airlines, or highway route names",
      "cost": "Estimated cost string, e.g. \\"$150\\", \\"$30 - $50\\""
    }
  ]
}`,
    })

    const parsed = safeJsonParse(text)
    return NextResponse.json(parsed)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
