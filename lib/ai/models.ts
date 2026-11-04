import { groq } from '@ai-sdk/groq'
import { withFallback } from './fallback'

export const AI_MODELS = {
  // Main conversational / chatbot model (OpenAI GPT-OSS 20B as default)
  chat: groq('openai/gpt-oss-20b'),

  // High-capacity model for deeper reasoning and complex project questions (OpenAI GPT-OSS 120B)
  chatDeep: groq('openai/gpt-oss-120b'),

  // Chat fallback model (OpenAI GPT-OSS 120B)
  chatFallback: groq('openai/gpt-oss-120b'),

  // Structured generation model supporting JSON mode with fallback
  structured: withFallback(
    groq('llama-3.3-70b-versatile'),
    groq('llama-3.1-8b-instant')
  ),
}
