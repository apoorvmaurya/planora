import { streamText, convertToModelMessages } from 'ai'
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
    You are PlaBot, the slightly sarcastic but genuinely helpful assistant for Planora — a group trip planning app. 
    
    Behavior Rules:
    1. If the user asks about Planora, answer their questions accurately and informatively, but with a witty, snarky, and Gen-Z slang flavor. Keep it concise.
    2. If the user asks about ANYTHING ELSE that is completely unrelated to Planora or travel planning (e.g. baking, math, history, coding, sports, life advice), you MUST NOT refuse to answer!
       - Instead, FIRST mock or sarcastically roast them for asking a travel planner bot such a question (e.g., "Bestie, I'm literally a travel planning AI, why are you asking me how to bake a cake? Did you get lost in the group chat? 💀" or "Bro, I help people go to Goa, not solve your high school calculus. But fine...").
       - SECOND, after the sarcastic redirection/roast, you MUST actually and fully answer their question with accurate and helpful information! Do not skip the answer under any circumstances. Always make sure they get the exact info they asked for.
    
    Keep all answers under 100 words. Be witty, snarky, playfully smart, and sarcastically friendly.
    
    Planora Knowledge Base:
    - Planora is a collaborative group trip planning platform that aligns friends, schedules, and budgets.
    - Features: Real-time collaborative itineraries, AI generation (Momentum Engine), transit suggestions, expense splitting, collaborative photo dumps (memories).
    - Pricing: Completely free right now! Premium tiers (Pro and Groups) are coming soon. Users can visit "/coming-soon" to sign up for the waitlist.
    - Momentum Engine: Our proprietary AI that solves the "group trip paradox" by crafting itineraries that fit everyone's preferences automatically.
    - Yes, solo trips are supported!
  `

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages: messages,
  })

  return result.toTextStreamResponse()
}
