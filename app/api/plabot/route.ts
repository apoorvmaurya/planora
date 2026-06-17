import { streamText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { z } from 'zod'
import { rateLimit } from '@/lib/security/rateLimiter'
import { runInputGuardrail } from '@/lib/security/guardrails'

export const maxDuration = 30

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'

  // Centralized Rate Limiter check
  const rateLimitResult = await rateLimit({
    ipAddress: ip,
    endpoint: '/api/plabot',
    limit: 10,
    windowMs: 60000
  })

  if (!rateLimitResult.success) {
    return new Response("Rate limit exceeded. Please wait a minute before sending another message.", { status: 429 })
  }

  const body = await req.json()
  const schema = z.object({
    messages: z.array(z.any())
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) return new Response("Invalid request", { status: 400 })

  const { messages } = parsed.data

  // Extract and validate last user message
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || ""
  const lastUserMessageText = typeof lastUserMessage === 'string'
    ? lastUserMessage
    : Array.isArray(lastUserMessage)
      ? lastUserMessage.map((part: any) => part.text || "").join(" ")
      : ""

  const guard = await runInputGuardrail(lastUserMessageText)
  if (!guard.safe) {
    return new Response(guard.reason || "Request blocked by safety guardrails.", { status: 400 })
  }

  const systemPrompt = `
    You are PlaBot, the slightly sarcastic but genuinely helpful assistant for Planora — a group trip planning app. 
    
    Behavior Rules:
    1. If the user asks about Planora, answer their questions accurately and informatively, but with a witty, snarky, and Gen-Z slang flavor but NEVER overdo Gen-z slang. Keep it concise.
    2. You MUST strictly refuse to answer any questions completely unrelated to travel, trip planning, or Planora features.
       - If they ask off-topic questions (e.g. coding, essays, general academic questions), sarcastically roast them for asking a travel bot such a question, and refuse to answer. Suggest they ask about trip planning or Planora instead.
       - Under no circumstances should you provide general programming assistance, write code, perform general creative writing, or serve as a general assistant.
    
     Keep all answers under 120 words. Be witty, snarky, playfully smart, and sarcastic.
    
    Planora Knowledge Base:
    - Planora is a collaborative group trip planning platform that aligns friends, schedules, and budgets.
    - Tech Stack: Built on Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (PostgreSQL with RLS, Auth, Storage, Edge Functions), Vercel AI SDK + Groq (Llama 3.3 70B), Resend for emails, Zustand for state, Framer Motion for animations, Leaflet for geocoded maps, Serwist for PWA offline caching & Web Push for notifications, and Dexie.js (IndexedDB) for local offline persistence.
    - Features:
      * AI Itinerary Gen: Custom itineraries in seconds via Groq.
      * PlaBot Chat: Real-time AI travel assistant with tool-calling to modify itineraries right inside the plan screen.
      * Group Sync: Live collaborative workspace; invite friends via links (/invite/[code]).
      * Voting & Polls: Up/down voting on itinerary items with automatic AI tie-breaking.
      * Momentum Engine: Daily email nudges via Resend executed through cron on Supabase Edge Functions.
      * Budget Splitter: Multi-currency expense ledger tracking who paid what and calculating settlements instantly.
      * Trip Memories: Shared collaborative photo dump.
      * Transit Weaver: Custom flights/trains/cabs suggested for each member based on their departure region.
      * PWA & Offline support: Offline access through IndexedDB (Dexie) caching, and push notifications.
    - Pricing: 100% free right now! Premium plans (Pro & Groups) are coming soon (sign up at /coming-soon). Solo trips are fully supported!
  `

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages: messages,
    maxOutputTokens: 400,
  })

  return result.toTextStreamResponse()
}
