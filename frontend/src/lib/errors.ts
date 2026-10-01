import { ApiError } from './api.ts'

/** The error for the form-level message: null if it belongs to one of
 * `fields`, which show it next to the input instead. */
export function formError(error: unknown, fields: string[]): unknown {
  return error instanceof ApiError && error.field && fields.includes(error.field) ? null : error
}

/** The API names the invalid field; show the message next to it. */
export function fieldError(error: unknown, field: string): string | null {
  return error instanceof ApiError && error.field === field ? error.message : null
}
