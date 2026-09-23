import en from '../../messages/en.json'
import pt from '../../messages/pt-BR.json'
import {
  PASSWORD_MIN_LENGTH,
  firstError,
  passwordStrength,
  validateConsent,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
  type ValidationError,
} from './validation'

describe('validateRequired', () => {
  it('rejects empty and whitespace-only values', () => {
    expect(validateRequired('')).toBe('required')
    expect(validateRequired('   ')).toBe('required')
  })

  it('accepts any other text', () => {
    expect(validateRequired('Campinas')).toBeNull()
  })
})

describe('validateEmail', () => {
  it.each(['ana@unicamp.br', 'first.last+tag@example.co.uk', '  padded@example.com  '])(
    'accepts %p',
    (value) => {
      expect(validateEmail(value)).toBeNull()
    }
  )

  it.each(['plainaddress', 'no-domain@', '@no-user.com', 'no-dot@domain', 'two words@example.com'])(
    'rejects %p as invalid',
    (value) => {
      expect(validateEmail(value)).toBe('email_invalid')
    }
  )

  it('reports a missing email as required, not invalid', () => {
    expect(validateEmail('')).toBe('required')
    expect(validateEmail('   ')).toBe('required')
  })
})

describe('validatePassword', () => {
  it('requires a password', () => {
    expect(validatePassword('')).toBe('required')
  })

  it(`needs at least ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(validatePassword('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe('password_too_short')
    expect(validatePassword('a'.repeat(PASSWORD_MIN_LENGTH))).toBeNull()
  })

  it('does not trim: spaces are characters in a password', () => {
    expect(validatePassword('      ')).toBeNull()
  })
})

describe('validatePasswordConfirmation', () => {
  it('requires the confirmation', () => {
    expect(validatePasswordConfirmation('secret1', '')).toBe('required')
  })

  it('must match exactly', () => {
    expect(validatePasswordConfirmation('secret1', 'Secret1')).toBe('passwords_mismatch')
    expect(validatePasswordConfirmation('secret1', 'secret1')).toBeNull()
  })
})

describe('validateConsent', () => {
  it('requires the box to be ticked', () => {
    expect(validateConsent(false)).toBe('consent_required')
    expect(validateConsent(true)).toBeNull()
  })
})

describe('passwordStrength', () => {
  it('scores nothing for an empty password and 100 for a long, varied one', () => {
    expect(passwordStrength('')).toBe(0)
    expect(passwordStrength('Longer-Pass-2026')).toBe(100)
  })

  it('grows with length and variety', () => {
    const weak = passwordStrength('abcdef')
    const medium = passwordStrength('abcdefghij')
    const strong = passwordStrength('Abcdefghij1!')
    expect(weak).toBeLessThan(medium)
    expect(medium).toBeLessThan(strong)
  })
})

describe('firstError', () => {
  it('returns the first failure in field order', () => {
    expect(firstError(null, 'email_invalid', 'required')).toBe('email_invalid')
  })

  it('returns null when every field passes', () => {
    expect(firstError(null, null)).toBeNull()
  })
})

describe('messages', () => {
  const codes: ValidationError[] = [
    'required',
    'email_invalid',
    'password_too_short',
    'passwords_mismatch',
    'consent_required',
  ]

  it.each(codes)('%p has a message in both languages', (code) => {
    expect(typeof en.validation[code]).toBe('string')
    expect(typeof pt.validation[code]).toBe('string')
  })
})
