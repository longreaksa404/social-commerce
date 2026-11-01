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
//
// Two sessions can live side by side (01_PRODUCT.md §22.11, 2026-10-28): a
// shop's login (`api` and friends below) and the admin's own (`adminApi`),
// each with its token, its cookie (the API's /auth or /admin/auth) and its
// refresh lock.

/** `keepalive`: the request finishes even if the page goes to the
 * background meanwhile (e.g. Telegram opening on top of it). */
type Options = { method?: string; body?: unknown; auth?: boolean; keepalive?: boolean; headers?: Record<string, string> }

/** The API's full address for `path`, for navigator.sendBeacon. */
export const apiUrl = (path: string) => `${API_URL}/api/v1${path}`

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

function withRefreshLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(name, task)
  }
  return task()
}

/** Open as seller (01_PRODUCT.md §22.11, D1A): the admin's 30-minute
 * token for a shop's owner, in this tab only (sessionStorage, so a reload
 * keeps it and other tabs never see it). While it's set the shop's session
 * uses it and nothing else: no refresh, and the browser's own shop login
 * (its cookie and the localStorage flag) is left as it was. */
export type Acting = { access_token: string; expires_at: string; store_id: string; shop: string }
const ACTING_KEY = 'sc.acting'

export function readActing(): Acting | null {
  try {
    const raw = sessionStorage.getItem(ACTING_KEY)
    return raw ? (JSON.parse(raw) as Acting) : null
  } catch {
    return null
  }
}

export function startActing(acting: Acting) {
  sessionStorage.setItem(ACTING_KEY, JSON.stringify(acting))
}

export function stopActing() {
  try {
    sessionStorage.removeItem(ACTING_KEY)
  } catch {
    // ignore
  }
}

/** Leave Open as seller: back to the shop's page in the admin, on a
 * fresh page so nothing of the shop's stays in memory. */
export function exitActing() {
  const acting = readActing()
  stopActing()
  window.location.assign(acting ? `/admin/shops/${acting.store_id}` : '/admin')
}

function createSession({
  refreshPath,
  sessionKey,
  lockName,
  acting = () => null,
}: {
  refreshPath: string
  sessionKey: string
  lockName: string
  acting?: () => Acting | null
}) {
  let accessToken: string | null = acting()?.access_token ?? null
  let onSessionEnded: () => void = () => {}
  let refreshing: Promise<boolean> | null = null

  function saveTokens(token: AccessToken) {
    accessToken = token.access_token
    if (acting()) return
    try {
      localStorage.setItem(sessionKey, '1')
    } catch {
      // Private mode etc.: a reload just won't try to restore the session.
    }
  }

  function clearTokens() {
    accessToken = null
    if (acting()) return
    try {
      localStorage.removeItem(sessionKey)
    } catch {
      // ignore
    }
  }

  function hasStoredSession() {
    if (acting()) return true
    try {
      return localStorage.getItem(sessionKey) !== null
    } catch {
      return false
    }
  }

  /** Called when a refresh fails, so the app can send the user to login. */
  function setSessionEndedHandler(handler: () => void) {
    onSessionEnded = handler
  }

  /**
   * Trade the refresh cookie for a new access token (and a new cookie).
   * Each refresh token is swapped once (the server treats reuse after 60 s
   * as theft and ends every session; sooner is taken as a retry after a
   * lost answer), so refreshes are serialized within the tab and, via the
   * Web Locks API, across tabs; each one sends the cookie the last one set.
   */
  function refreshTokens(): Promise<boolean> {
    // Opened as a seller: no refresh, the 30 minutes are the 30 minutes.
    if (acting()) return Promise.resolve(false)
    refreshing ??= withRefreshLock(lockName, async () => {
      if (!hasStoredSession()) return false
      const response = await send(refreshPath, { method: 'POST' })
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

  /** A request with the access token, refreshed once on a 401; throws
   * ApiError for any failure. */
  async function authorizedFetch(
    path: string,
    { method = 'GET', body, auth = true, keepalive, headers: extra }: Options,
  ): Promise<Response> {
    const request = (): Promise<Response> => {
      const headers: Record<string, string> = { ...extra }
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

  async function api<T>(path: string, options: Options = {}) {
    const response = await authorizedFetch(path, options)
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return { saveTokens, clearTokens, hasStoredSession, setSessionEndedHandler, refreshTokens, authorizedFetch, api }
}

const seller = createSession({ refreshPath: '/auth/refresh', sessionKey: SESSION_KEY, lockName: 'sc-token-refresh', acting: readActing })

export const { saveTokens, clearTokens, hasStoredSession, setSessionEndedHandler, refreshTokens, api } = seller

/** The admin's own session (/admin/auth), beside a shop's login. */
export const admin = createSession({ refreshPath: '/admin/auth/refresh', sessionKey: 'sc.admin', lockName: 'sc-admin-refresh' })
export const adminApi = admin.api

/** A file from the API (an Excel export), as the logged-in seller. */
export async function apiBlob(path: string): Promise<Blob> {
  return (await seller.authorizedFetch(path, {})).blob()
}

/** The same, as the admin. */
export async function adminBlob(path: string): Promise<Blob> {
  return (await admin.authorizedFetch(path, {})).blob()
}
