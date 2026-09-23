/**
 * Form validation shared by every form: sign-in, registration, the newsletter
 * boxes and the biogas calculator.
 *
 * Validators return an error CODE, never text. A form shows it with
 * `t(`validation.${code}`)`, so each rule is written once, here, and its words
 * live in the message catalogs in both languages. `null` means valid.
 *
 * These checks are for the person filling the form in — quick, forgiving
 * feedback. The server stays the authority on what it accepts.
 */

export type ValidationError =
  | 'required'
  | 'email_invalid'
  | 'password_too_short'
  | 'passwords_mismatch'
  | 'consent_required'

/** Shortest password the sign-up form accepts. */
export const PASSWORD_MIN_LENGTH = 6

/** One @, something on each side, a dot in the domain, no spaces. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRequired(value: string): ValidationError | null {
  return value.trim() === '' ? 'required' : null
}

export function validateEmail(value: string): ValidationError | null {
  const email = value.trim()
  if (email === '') return 'required'
  return EMAIL_PATTERN.test(email) ? null : 'email_invalid'
}

export function validatePassword(value: string): ValidationError | null {
  if (value === '') return 'required'
  return value.length >= PASSWORD_MIN_LENGTH ? null : 'password_too_short'
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): ValidationError | null {
  if (confirmation === '') return 'required'
  return password === confirmation ? null : 'passwords_mismatch'
}

export function validateConsent(checked: boolean): ValidationError | null {
  return checked ? null : 'consent_required'
}

/**
 * A 0–100 score for the strength meter: length first, then variety. Advisory
 * only — it never blocks a submission.
 */
export function passwordStrength(password: string): number {
  let score = 0
  if (password.length >= PASSWORD_MIN_LENGTH) score += 25
  if (password.length >= 10) score += 25
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25
  if (/\d/.test(password)) score += 15
  if (/[^a-zA-Z\d]/.test(password)) score += 10
  return score
}

/** The first failed check of a form, or null when every field is valid. */
export function firstError(
  ...results: Array<ValidationError | null>
): ValidationError | null {
  return results.find((result) => result !== null) ?? null
}
