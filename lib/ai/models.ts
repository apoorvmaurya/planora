import { groq } from '@ai-sdk/groq'
import { withFallback } from './fallback'

export const AI_MODELS = {
  // Main conversational model (Llama 3.3 70B)
  chat: groq('llama-3.3-70b-versatile'),

  // Chat fallback model (Llama 3.1 8B)
  chatFallback: groq('llama-3.1-8b-instant'),

  // Structured generation model supporting JSON mode with fallback
  structured: withFallback(
    groq('llama-3.3-70b-versatile'),
    groq('llama-3.1-8b-instant')
  ),
}
