/**
 * Centralized error handling and typed Result pattern for Planora.
 * Replaces unstructured `console.error` and opaque catch blocks.
 */

export class AppError extends Error {
  public code?: string
  public status: number

  constructor(message: string, status = 500, code?: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

export type Result<T, E = AppError> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never }

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data }
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * Normalizes any caught unknown error into a structured human-readable message.
 * Emits structured logging while providing a clean message for UI toasts/alerts.
 */
export function handleApiError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    // Optionally log in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[API Error] ${error.name}: ${error.message}`)
    }
    return error.message || fallbackMessage
  }

  if (typeof error === 'string') {
    return error
  }

  return fallbackMessage
}
