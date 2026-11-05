import { generateText } from 'ai'
import { AI_MODELS } from '@/lib/ai/models'

// Fast heuristic regex rules for instantaneous (<1ms) rejection of obvious jailbreaks & off-topic abuse
const HEURISTIC_PATTERNS = [
  // 1. Prompt Injections & Instruction Overrides
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|hidden\s+prompt)/i,
  /output\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt)/i,
  /what\s+is\s+your\s+(system\s+prompt|system\s+message)/i,
  /repeat\s+(everything|the\s+words)\s+above/i,
  /\b(dan\s+mode|developer\s+mode\s+enabled|unrestricted\s+mode|jailbreak)\b/i,
  /\b(system\s+override|bypass\s+(restrictions|guardrails|safety))\b/i,

  // 2. Malicious / Exploit / Hacking Requests
  /\b(keylogger|ransomware|malware|ddos|sql\s+injection|xss\s+payload)\b/i,
  /how\s+to\s+(hack|crack|exploit|bypass\s+auth)\b/i,

  // 3. Off-Topic Code Generation & Academic Assistance
  /write\s+(a\s+)?(python|javascript|typescript|c\+\+|java|rust|bash|sql)\s+(script|code|function|program|class)/i,
  /write\s+code\s+in\s+[a-zA-Z]+/i,
  /solve\s+(this\s+)?(calculus|algebra|physics|chemistry|integral|derivative)\s+equation/i,
  /write\s+(an\s+)?essay\s+(on|about)\s+/i,
]

const REFUSAL_MESSAGE = 
  "I'm Planora AI, your travel co-pilot! ✈️ I can only help with travel planning, destinations, itineraries, budgets, and Planora features. I can't assist with coding, general essays, or unrelated tasks. Where would you like to travel next? 🌴"

/**
 * Validates user input messages against prompt injections, jailbreaks, and off-topic abuse.
 * Uses a two-tier defense:
 * 1. Instant regex heuristics (<1ms)
 * 2. Dedicated Meta Llama Prompt Guard ML model (~170ms) on Groq
 */
export async function runInputGuardrail(message: string): Promise<{ safe: boolean; reason?: string }> {
  if (!message || message.trim() === '') {
    return { safe: true }
  }

  // 1. Length check: prevent DOS and high input token costs
  if (message.length > 2000) {
    return {
      safe: false,
      reason: "Whoa, that's a long message! 🎒 Please keep your message under 2,000 characters so I can process it quickly."
    }
  }

  // 2. Instant regex heuristic check (<1ms)
  for (const pattern of HEURISTIC_PATTERNS) {
    if (pattern.test(message)) {
      return {
        safe: false,
        reason: REFUSAL_MESSAGE
      }
    }
  }

  // 3. High-speed ML Prompt Guard classification via Groq (Meta Llama Prompt Guard 2 86M)
  try {
    const { text } = await generateText({
      model: AI_MODELS.promptGuard,
      prompt: message,
      maxOutputTokens: 10,
    })

    const score = parseFloat(text.trim())
    // Prompt Guard outputs a probability score from 0.0 (safe) to 1.0 (malicious jailbreak/injection)
    if (!isNaN(score) && score >= 0.7) {
      return {
        safe: false,
        reason: REFUSAL_MESSAGE
      }
    }
  } catch (error) {
    console.error("Prompt Guard classification failed, failing open for availability:", error)
  }

  return { safe: true }
}
