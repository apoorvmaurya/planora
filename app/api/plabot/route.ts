import { streamText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  
  const supabase = await createClient()
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  
  const { count } = await supabase
    .from('request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('endpoint', '/api/plabot')
    .gte('created_at', oneMinuteAgo)

  if (count && count >= 10) {
    return new Response("Rate limit exceeded.", { status: 429 })
  }
  
  await supabase.from('request_logs').insert({ ip_address: ip, endpoint: '/api/plabot' })

  const body = await req.json()
  const schema = z.object({
    messages: z.array(z.any())
  })
  
  const parsed = schema.safeParse(body)
  if (!parsed.success) return new Response("Invalid request", { status: 400 })
  
  const { messages } = parsed.data

  const systemPrompt = `
    You are PlaBot, the assistant for Planora — a group trip planning app. 
    Answer ONLY questions about Planora's features, pricing, and how it works. 
    If asked anything unrelated, politely redirect. Keep answers under 80 words. Be warm and enthusiastic.
    
    Knowledge Base:
    - Planora is a collaborative trip planning platform that lets groups build itineraries, vote on activities, and split expenses seamlessly.
    - Features: Real-time collaborative itineraries, AI-powered generation (Momentum Engine), intelligent transit suggestions, expense splitting, and group chats.
    - Pricing Tiers: 
      1. Free (₹0) - Basic planning for up to 3 trips, standard AI.
      2. Pro (₹199/month) - Unlimited trips, advanced AI, priority support.
      3. Groups (₹499/month) - Covers up to 10 members, premium features for the whole group.
    - Momentum Engine: Planora's proprietary AI that analyzes everyone's travel preferences, dietary restrictions, and budget to craft the perfect group itinerary.
    - Yes, you can definitely use Planora for solo trips too!
  `

  const result = streamText({
    model: groq('llama-3.1-8b-instant'),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
