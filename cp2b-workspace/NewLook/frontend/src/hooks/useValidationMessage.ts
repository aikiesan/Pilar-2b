'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { PASSWORD_MIN_LENGTH, type ValidationError } from '@/lib/validation'

/** The message for a validation code (lib/validation), in the page's language. */
export function useValidationMessage(): (code: ValidationError) => string {
  const t = useTranslations('validation')
  return useCallback((code: ValidationError) => t(code, { min: PASSWORD_MIN_LENGTH }), [t])
}
