/**
 * Tests for error types and utilities
 */
import {
  isAppError,
  isAuthError,
  isApiError,
  toAppError,
  createAuthError,
  createApiError,
  getErrorMessage,
  type AppError,
  type AuthError,
  type ApiError,
} from '../errors'

describe('Error Type Guards', () => {
  describe('isAppError', () => {
    it('should return true for valid AppError', () => {
      const error: AppError = { message: 'Test error', code: 'TEST_ERROR' }
      expect(isAppError(error)).toBe(true)
    })

    it('should return false for non-AppError objects', () => {
      expect(isAppError(null)).toBe(false)
      expect(isAppError(undefined)).toBe(false)
      expect(isAppError('string')).toBe(false)
      expect(isAppError(123)).toBe(false)
      expect(isAppError({})).toBe(false)
    })

    it('should return true for Error with message', () => {
      const error = new Error('Test')
      expect(isAppError(error)).toBe(true)
    })
  })

  describe('isAuthError', () => {
    it('should return true for valid AuthError', () => {
      const error: AuthError = {
        message: 'Auth failed',
        code: 'AUTH_FAILED',
      }
      expect(isAuthError(error)).toBe(true)
    })

    it('should return false for non-AuthError codes', () => {
      const error: AppError = {
        message: 'Test error',
        code: 'UNKNOWN_ERROR',
      }
      expect(isAuthError(error)).toBe(false)
    })

    it('should validate all AuthError codes', () => {
      const codes: AuthError['code'][] = [
        'AUTH_FAILED',
        'INVALID_CREDENTIALS',
        'SESSION_EXPIRED',
        'UNAUTHORIZED',
        'REGISTRATION_FAILED',
      ]

      codes.forEach((code) => {
        const error: AuthError = { message: 'Test', code }
        expect(isAuthError(error)).toBe(true)
      })
    })
  })

  describe('isApiError', () => {
    it('should return true for valid ApiError', () => {
      const error: ApiError = {
        message: 'API error',
        code: 'SERVER_ERROR',
      }
      expect(isApiError(error)).toBe(true)
    })

    it('should return false for non-ApiError codes', () => {
      const error: AppError = {
        message: 'Test error',
        code: 'UNKNOWN_ERROR',
      }
      expect(isApiError(error)).toBe(false)
    })

    it('should validate all ApiError codes', () => {
      const codes: ApiError['code'][] = [
        'NETWORK_ERROR',
        'TIMEOUT',
        'SERVER_ERROR',
        'NOT_FOUND',
        'VALIDATION_ERROR',
      ]

      codes.forEach((code) => {
        const error: ApiError = { message: 'Test', code }
        expect(isApiError(error)).toBe(true)
      })
    })
  })
})

describe('Error Conversion', () => {
  describe('toAppError', () => {
    it('should return AppError as-is', () => {
      const error: AppError = { message: 'Test', code: 'TEST' }
      const result = toAppError(error)

      expect(result.message).toBe('Test')
      expect(result.code).toBe('TEST')
      expect(result.details).toBe(error) // Details should be preserved for error tracking
    })

    it('should convert Error to AppError', () => {
      const error = new Error('Test error')
      const result = toAppError(error)

      expect(result.message).toBe('Test error')
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.details).toBe(error)
    })

    it('should convert string to AppError', () => {
      const result = toAppError('Test error string')

      expect(result.message).toBe('Test error string')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should convert object with message to AppError', () => {
      const error = { message: 'Test message', extra: 'data' }
      const result = toAppError(error)

      expect(result.message).toBe('Test message')
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.details).toBe(error)
    })

    it('should handle unknown error types', () => {
      const result = toAppError(123)

      expect(result.message).toBe('An unknown error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.details).toBe(123)
    })
  })

  describe('getErrorMessage', () => {
    it('should extract message from AppError', () => {
      const error: AppError = { message: 'Test error', code: 'TEST' }
      expect(getErrorMessage(error)).toBe('Test error')
    })

    it('should extract message from Error', () => {
      const error = new Error('Test error')
      expect(getErrorMessage(error)).toBe('Test error')
    })

    it('should extract message from string', () => {
      expect(getErrorMessage('Test error')).toBe('Test error')
    })

    it('should handle unknown errors', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred')
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred')
      expect(getErrorMessage(123)).toBe('An unknown error occurred')
    })
  })
})

describe('Error Creators', () => {
  describe('createAuthError', () => {
    it('should create AuthError with all properties', () => {
      const error = createAuthError('Test message', 'AUTH_FAILED', 401)

      expect(error.message).toBe('Test message')
      expect(error.code).toBe('AUTH_FAILED')
      expect(error.statusCode).toBe(401)
    })

    it('should use default code if not provided', () => {
      const error = createAuthError('Test message')

      expect(error.message).toBe('Test message')
      expect(error.code).toBe('AUTH_FAILED')
      expect(error.statusCode).toBeUndefined()
    })

    it('should create errors with all auth codes', () => {
      const codes: AuthError['code'][] = [
        'AUTH_FAILED',
        'INVALID_CREDENTIALS',
        'SESSION_EXPIRED',
        'UNAUTHORIZED',
        'REGISTRATION_FAILED',
      ]

      codes.forEach((code) => {
        const error = createAuthError('Test', code)
        expect(error.code).toBe(code)
        expect(isAuthError(error)).toBe(true)
      })
    })
  })

  describe('createApiError', () => {
    it('should create ApiError with all properties', () => {
      const error = createApiError(
        'Test message',
        'SERVER_ERROR',
        '/api/test',
        500
      )

      expect(error.message).toBe('Test message')
      expect(error.code).toBe('SERVER_ERROR')
      expect(error.endpoint).toBe('/api/test')
      expect(error.statusCode).toBe(500)
    })

    it('should use default code if not provided', () => {
      const error = createApiError('Test message')

      expect(error.message).toBe('Test message')
      expect(error.code).toBe('SERVER_ERROR')
      expect(error.endpoint).toBeUndefined()
      expect(error.statusCode).toBeUndefined()
    })

    it('should create errors with all API codes', () => {
      const codes: ApiError['code'][] = [
        'NETWORK_ERROR',
        'TIMEOUT',
        'SERVER_ERROR',
        'NOT_FOUND',
        'VALIDATION_ERROR',
      ]

      codes.forEach((code) => {
        const error = createApiError('Test', code)
        expect(error.code).toBe(code)
        expect(isApiError(error)).toBe(true)
      })
    })
  })
})

describe('Error Integration', () => {
  it('should maintain error chain', () => {
    const originalError = new Error('Original error')
    const appError = toAppError(originalError)

    expect(appError.details).toBe(originalError)
    expect(getErrorMessage(appError)).toBe('Original error')
  })

  it('should work with nested errors', () => {
    const innerError = { message: 'Inner error', code: 'INNER' }
    const outerError = toAppError(innerError)

    expect(outerError.message).toBe('Inner error')
    expect(outerError.details).toBe(innerError)
  })

  it('should handle Supabase-like errors', () => {
    // Simulate Supabase error structure
    const supabaseError = {
      message: 'Invalid login credentials',
      status: 400,
      name: 'AuthApiError',
    }

    const appError = toAppError(supabaseError)

    expect(appError.message).toBe('Invalid login credentials')
    expect(appError.code).toBe('UNKNOWN_ERROR')
    expect(appError.details).toBe(supabaseError)
  })
})
