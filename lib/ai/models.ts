import { groq } from '@ai-sdk/groq'
import { withFallback } from './fallback'

export const AI_MODELS = {
  // Main conversational / chatbot model (OpenAI GPT-OSS 20B as default)
  chat: groq('openai/gpt-oss-20b'),

  // High-capacity model for deeper reasoning and complex project questions (OpenAI GPT-OSS 120B)
  chatDeep: groq('openai/gpt-oss-120b'),

  // Chat fallback model (OpenAI GPT-OSS 120B)
  chatFallback: groq('openai/gpt-oss-120b'),

  // Ultra-fast dedicated Prompt Guard ML model for instantaneous jailbreak & injection classification
  promptGuard: groq('meta-llama/llama-prompt-guard-2-86m'),

  // Structured generation model supporting JSON mode with fallback
  structured: withFallback(
    groq('openai/gpt-oss-20b'),
    groq('openai/gpt-oss-120b')
  ),
}
