import { wrapLanguageModel } from 'ai'
import type { LanguageModel } from 'ai'

/**
 * Wraps a primary model with a fallback model. If any generate or stream call
 * on the primary model throws an error (e.g., rate limit 429), it will automatically
 * fall back to the backup model.
 */
export function withFallback(primaryModel: LanguageModel, fallbackModel: LanguageModel): LanguageModel {
  return wrapLanguageModel({
    model: primaryModel as any,
    middleware: {
      specificationVersion: 'v3',
      wrapGenerate: async ({ doGenerate, params }) => {
        try {
          return await doGenerate()
        } catch (error) {
          console.warn("Primary model generate call failed. Falling back to backup model. Error:", error)
          return await (fallbackModel as any).doGenerate(params)
        }
      },
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream()
        } catch (error) {
          console.warn("Primary model stream call failed. Falling back to backup model. Error:", error)
          return await (fallbackModel as any).doStream(params)
        }
      }
    }
  })
}

