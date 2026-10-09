const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const REFRESH_KEY = 'sc.refresh_token'

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

export type TokenPair = { access_token: string; refresh_token: string }

// The access token lives only in memory. The refresh token is in
// localStorage so a reload keeps you logged in.
// TODO(Phase 9, custom domain): move it to an httpOnly cookie once the API
// and app share a site; cross-site cookies between vercel.app and
// onrender.com are blocked by browsers.
let accessToken: string | null = null
let onSessionEnded: () => void = () => {}

export function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function saveTokens(pair: TokenPair) {
  accessToken = pair.access_token
  try {
    localStorage.setItem(REFRESH_KEY, pair.refresh_token)
  } catch {
    // Private mode etc.: the session just won't survive a reload.
  }
}

export function clearTokens() {
  accessToken = null
  try {
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    // ignore
  }
}

export function hasStoredSession() {
  return readRefreshToken() !== null
}


/** Called when a refresh fails, so the app can send the user to login. */
export function setSessionEndedHandler(handler: () => void) {
  onSessionEnded = handler
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}/api/v1${path}`, init)
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
 * Exchange the stored refresh token for a new pair. Each refresh token
 * is swapped once (the server treats reuse after 60 s as theft and ends
 * every session; sooner is taken as a retry after a lost answer), so
 * refreshes are serialized within the tab and, via the Web Locks API,
 * across tabs; each one reads the latest token from storage.
 */
export function refreshTokens(): Promise<boolean> {
  refreshing ??= withRefreshLock(async () => {
    const refreshToken = readRefreshToken()
    if (!refreshToken) return false
    const response = await send('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
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

type Options = { method?: string; body?: unknown; auth?: boolean }

/** A request with the access token, refreshed once on a 401; throws
 * ApiError for any failure. */
async function authorizedFetch(path: string, { method = 'GET', body, auth = true }: Options): Promise<Response> {
  const request = (): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`
    return send(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
