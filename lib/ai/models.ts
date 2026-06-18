import { groq } from '@ai-sdk/groq'

export const AI_MODELS = {
  // Main conversational model (Llama 3.3 70B)
  chat: groq('llama-3.3-70b-versatile'),

  // Chat fallback model (Llama 3.1 8B)
  chatFallback: groq('llama-3.1-8b-instant'),

  // Structured generation model (Llama 4 Scout 17B) supporting strict json_schema
  structured: groq('llama-4-scout-17b-16e-instruct'),
}
