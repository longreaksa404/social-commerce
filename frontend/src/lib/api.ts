const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
// Not a secret: only whether this browser may have a session to restore.
const SESSION_KEY = 'sc.session'

/** Error from the API's envelope: {"error": {"code", "message", "field"}}. */
export class ApiError extends Error {
  status: number
  code: string
  field: string | null

  constructor(status: number, code: string, message: string, field: string | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.field = field
  }
}

/** What login, refresh and the like answer with. */
export type AccessToken = { access_token: string }

// The access token lives only in memory. The refresh token is an httpOnly
// cookie the API sets (on order.oaksolve.com and api.oaksolve.com, one
// site), so no script here can read it; a reload trades it for a new
// access token. localStorage only remembers that there's a session to try.
let accessToken: string | null = null
let onSessionEnded: () => void = () => {}

export function saveTokens(token: AccessToken) {
  accessToken = token.access_token
  try {
    localStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Private mode etc.: a reload just won't try to restore the session.
  }
}

export function clearTokens() {
  accessToken = null
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function hasStoredSession() {
  try {
    return localStorage.getItem(SESSION_KEY) !== null
  } catch {
    return false
  }
}


/** Called when a refresh fails, so the app can send the user to login. */
export function setSessionEndedHandler(handler: () => void) {
  onSessionEnded = handler
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    // `include`: the refresh cookie goes to /auth and comes back from it.
    return await fetch(`${API_URL}/api/v1${path}`, { ...init, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.')
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null)
  const error = body?.error
  return new ApiError(
    response.status,
    error?.code ?? 'HTTP_ERROR',
    error?.message ?? `Request failed (${response.status}).`,
    error?.field ?? null,
  )
}

let refreshing: Promise<boolean> | null = null

/**
 * Trade the refresh cookie for a new access token (and a new cookie).
 * Each refresh token is swapped once (the server treats reuse after 60 s
 * as theft and ends every session; sooner is taken as a retry after a
 * lost answer), so refreshes are serialized within the tab and, via the
 * Web Locks API, across tabs; each one sends the cookie the last one set.
 */
export function refreshTokens(): Promise<boolean> {
  refreshing ??= withRefreshLock(async () => {
    if (!hasStoredSession()) return false
    const response = await send('/auth/refresh', { method: 'POST' })
    if (!response.ok) {
      if (response.status === 401) clearTokens()
      return false
    }
    saveTokens(await response.json())
    return true
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}

function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('sc-token-refresh', task)
  }
  return task()
}

/** `keepalive`: the request finishes even if the page goes to the
 * background meanwhile (e.g. Telegram opening on top of it). */
type Options = { method?: string; body?: unknown; auth?: boolean; keepalive?: boolean }

/** A request with the access token, refreshed once on a 401; throws
 * ApiError for any failure. */
async function authorizedFetch(path: string, { method = 'GET', body, auth = true, keepalive }: Options): Promise<Response> {
  const request = (): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`
    return send(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
    })
  }

  let response = await request()
  if (response.status === 401 && auth) {
    if (await refreshTokens()) {
      response = await request()
    } else {
      clearTokens()
      onSessionEnded()
    }
  }
  if (!response.ok) throw await toApiError(response)
  return response
}

export async function api<T>(path: string, options: Options = {}) {
  const response = await authorizedFetch(path, options)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** A file from the API (an Excel export), as the logged-in seller. */
export async function apiBlob(path: string): Promise<Blob> {
  return (await authorizedFetch(path, {})).blob()
}
