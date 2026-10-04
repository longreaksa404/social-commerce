import { currentLang, MESSAGES } from '../i18n/core.ts'
import { KM_BY_CODE, KM_BY_MESSAGE } from '../i18n/messages/apiErrors.ts'
import { ApiError } from './api.ts'

/** What to tell the user about a failed request, in their language. The
 * API writes English; Khmer is looked up (src/i18n/messages/apiErrors.ts). */
export function errorText(error: unknown, fallback?: string): string {
  const lang = currentLang()
  if (!(error instanceof ApiError)) return fallback ?? MESSAGES[lang].common.somethingWrong
  if (lang === 'en') return error.message
  return KM_BY_MESSAGE[error.message] ?? KM_BY_CODE[error.code] ?? MESSAGES.km.common.somethingWrong
}

/** The error for the form-level message: null if it belongs to one of
 * `fields`, which show it next to the input instead. */
export function formError(error: unknown, fields: string[]): unknown {
  return error instanceof ApiError && error.field && fields.includes(error.field) ? null : error
}

/** The API names the invalid field; show the message next to it. */
export function fieldError(error: unknown, field: string): string | null {
  return error instanceof ApiError && error.field === field ? errorText(error) : null
}
