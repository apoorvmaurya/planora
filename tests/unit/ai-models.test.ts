import { describe, it, expect } from 'vitest'
import { AI_MODELS } from '@/lib/ai/models'

describe('AI Models Configuration (lib/ai/models.ts)', () => {
  it('configures openai/gpt-oss-20b as the default chatbot model', () => {
    expect(AI_MODELS.chat).toBeDefined()
    expect((AI_MODELS.chat as any).modelId).toBe('openai/gpt-oss-20b')
  })

  it('configures openai/gpt-oss-120b for deeper reasoning and fallback', () => {
    expect(AI_MODELS.chatDeep).toBeDefined()
    expect((AI_MODELS.chatDeep as any).modelId).toBe('openai/gpt-oss-120b')

    expect(AI_MODELS.chatFallback).toBeDefined()
    expect((AI_MODELS.chatFallback as any).modelId).toBe('openai/gpt-oss-120b')
  })

  it('provides structured generation model with fallback', () => {
    expect(AI_MODELS.structured).toBeDefined()
  })
})
