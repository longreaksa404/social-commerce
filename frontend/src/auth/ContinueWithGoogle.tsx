import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { ErrorMessage } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { GOOGLE_CLIENT_ID } from '../lib/google.ts'
import { saveSignup } from '../lib/signup.ts'
import type { SocialResult } from '../lib/types.ts'
import { GoogleButton } from './GoogleButton.tsx'
import { useAuth } from './useAuth.ts'

/** Google's button over the phone form, with "or" between them (Login and
 * Register). A Google account with a shop logs in; someone new goes on
 * to /register/google to set up their shop. Nothing when Google sign-in
 * isn't set up. */
export function ContinueWithGoogle() {
  const { startSession } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)
  const t = useT()

  const onCredential = useCallback(
    async (credential: string) => {
      setError(null)
      try {
        const result = await api<SocialResult>('/auth/google', {
          method: 'POST',
          body: { credential },
          auth: false,
        })
        if (result.access_token) {
          startSession({ access_token: result.access_token })
          navigate('/dashboard', { replace: true })
        } else if (result.signup) {
          saveSignup(result.signup)
          navigate('/register/google', { state: result.signup })
        }
      } catch (err) {
        setError(err)
      }
    },
    [navigate, startSession],
  )

  if (!GOOGLE_CLIENT_ID) return null
  return (
    <div className="mb-6 space-y-3">
      <GoogleButton onCredential={onCredential} />
      <ErrorMessage error={error} />
      <div className="flex items-center gap-3 pt-3 text-xs font-medium text-slate-400" aria-hidden>
        <span className="h-px flex-1 bg-slate-200" />
        {t.auth.google.or}
        <span className="h-px flex-1 bg-slate-200" />
      </div>
    </div>
  )
}
