import { describe, it, expect } from 'vitest'
import { AppError, handleApiError, ok, err } from '@/lib/errors'

describe('Centralized Error Handling (lib/errors.ts)', () => {
  it('instantiates AppError with default and custom status codes', () => {
    const defaultError = new AppError('Server error')
    expect(defaultError.status).toBe(500)
    expect(defaultError.message).toBe('Server error')

    const notFoundError = new AppError('Resource not found', 404, 'NOT_FOUND')
    expect(notFoundError.status).toBe(404)
    expect(notFoundError.code).toBe('NOT_FOUND')
  })

  it('formats Result types correctly with ok and err helpers', () => {
    const successResult = ok({ id: '123', name: 'Plan' })
    expect(successResult.success).toBe(true)
    if (successResult.success) {
      expect(successResult.data.id).toBe('123')
    }

    const failedResult = err(new AppError('Unauthorized', 401))
    expect(failedResult.success).toBe(false)
    if (!failedResult.success) {
      expect(failedResult.error.status).toBe(401)
    }
  })

  it('handleApiError handles AppError, standard Error, string, and unknown objects', () => {
    expect(handleApiError(new AppError('Custom app error'))).toBe('Custom app error')
    expect(handleApiError(new Error('Standard JS error'))).toBe('Standard JS error')
    expect(handleApiError('Raw string error message')).toBe('Raw string error message')
    expect(handleApiError(null, 'Fallback msg')).toBe('Fallback msg')
    expect(handleApiError(undefined, 'Default message')).toBe('Default message')
  })
})
