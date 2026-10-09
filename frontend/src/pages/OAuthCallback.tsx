import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useSocialResult } from '../auth/useSocialResult.ts'
import { useAuth } from '../auth/useAuth.ts'
import { useFeedback } from '../components/feedback.ts'
import { ErrorMessage, Spinner } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { callbackUrl, forgetOAuth, pendingOAuth, PROVIDER_NAMES, type OAuthProvider } from '../lib/oauth.ts'
import type { Account, SocialResult } from '../lib/types.ts'
import { keys } from '../dashboard/queries.ts'
import { AuthLayout } from './AuthLayout.tsx'

/** /auth/<facebook|tiktok>/callback: back from the provider's sign-in page
 * with a one-time code (or an error). Only a sign-in this tab started (the
 * `state` it saved) is finished. Logging in goes on like "Continue with
 * Google"; connecting (Settings → Your account) saves it and goes back
 * there. */
export function OAuthCallback() {
  const { provider } = useParams()
  const [params] = useSearchParams()
  const [pending] = useState(() => pendingOAuth(provider, params.get('state')))
  const { status } = useAuth()
  const onResult = useSocialResult()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [error, setError] = useState<unknown>(null)
  const started = useRef(false)
  const t = useT()
  const c = t.auth.social

  const code = params.get('code')
  const name = provider === 'facebook' || provider === 'tiktok' ? PROVIDER_NAMES[provider] : ''
  // Connecting needs the session restored first (a full page load).
  const ready = pending !== null && code !== null && (pending.intent === 'login' || status !== 'loading')

  useEffect(() => {
    if (!ready || started.current || !pending || !code) return
    started.current = true
    const p = pending.provider as OAuthProvider
    const body = { code, redirect_uri: callbackUrl(p) }
    const finish =
      pending.intent === 'login'
        ? api<SocialResult>(`/auth/oauth/${p}`, { method: 'POST', body, auth: false }).then(onResult)
        : api<Account>(`/seller/account/oauth/${p}`, { method: 'POST', body }).then((account) => {
            queryClient.setQueryData(keys.account, account)
            toast(t.settings.loginConnected(PROVIDER_NAMES[p]))
            navigate('/dashboard/settings/account', { replace: true })
          })
    finish.catch(setError).finally(forgetOAuth)
  }, [ready, pending, code, onResult, navigate, queryClient, toast, t])

  const back =
    pending?.intent === 'connect' ? (
      <Link to="/dashboard/settings/account" className="font-semibold text-navy-700 hover:underline">
        {c.backToAccount}
      </Link>
    ) : (
      <Link to="/login" className="font-semibold text-navy-700 hover:underline">
        {c.tryAgain}
      </Link>
    )

  // Refused or cancelled on the provider's page, or not this tab's sign-in.
  const problem = params.get('error') ? c.cancelled(name || '…') : !pending || !code ? c.stale : null

  if (problem || error) {
    return (
      <AuthLayout title={c.failedTitle} footer={back}>
        <title>{c.failedTitle}</title>
        {problem ? <p className="text-sm leading-6 text-slate-700">{problem}</p> : <ErrorMessage error={error} />}
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title={c.working} footer={back}>
      <title>{c.working}</title>
      <Spinner label={c.working} />
    </AuthLayout>
  )
}
