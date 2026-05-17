import { streamText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const { messages } = await req.json()

  const supabase = await createClient()
  
  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()
  const { data: items } = await supabase.from('itinerary_items').select('*').eq('plan_id', planId).order('day_number').order('sort_order')

  const systemPrompt = `
    You are Planora AI, a friendly travel assistant helping the group with their trip to ${plan?.destination_name}.
    Trip Dates: ${plan?.start_date} to ${plan?.end_date}.
    Budget: ${plan?.budget_total} ${plan?.currency}.
    
    Current Itinerary Details:
    ${items?.map((i: any) => `Day ${i.day_number} (${i.time_of_day}): ${i.title} at ${i.location_name}. ${i.description}`).join("\n")}
    
    Answer the users' questions based strictly on their existing itinerary context. Be helpful, concise, and upbeat!
  `

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
