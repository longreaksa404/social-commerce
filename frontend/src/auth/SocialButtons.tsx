import { useCallback, useState } from 'react'
import { ErrorMessage } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { GOOGLE_CLIENT_ID } from '../lib/google.ts'
import { oauthAvailable, PROVIDER_NAMES, startOAuth, type OAuthProvider } from '../lib/oauth.ts'
import type { SocialResult } from '../lib/types.ts'
import { GoogleButton } from './GoogleButton.tsx'
import { ProviderButton } from './ProviderLogo.tsx'
import { useSocialResult } from './useSocialResult.ts'

const REDIRECT_PROVIDERS: OAuthProvider[] = ['facebook', 'tiktok']

/** Google, Facebook and TikTok over the phone form, with "or" between
 * (Login and Register; founder's order). Each shows only once its app is
 * set up; nothing at all when none is. */
export function SocialButtons() {
  const onResult = useSocialResult()
  const [error, setError] = useState<unknown>(null)
  const t = useT()
  const others = REDIRECT_PROVIDERS.filter(oauthAvailable)

  const onGoogle = useCallback(
    async (credential: string) => {
      setError(null)
      try {
        onResult(await api<SocialResult>('/auth/google', { method: 'POST', body: { credential }, auth: false }))
      } catch (err) {
        setError(err)
      }
    },
    [onResult],
  )

  if (!GOOGLE_CLIENT_ID && others.length === 0) return null
  return (
    <div className="mb-6 space-y-2.5">
      <GoogleButton onCredential={onGoogle} />
      {others.map((provider) => (
        <ProviderButton
          key={provider}
          provider={provider}
          label={t.auth.social.continueWith(PROVIDER_NAMES[provider])}
          onClick={() => startOAuth(provider, 'login')}
        />
      ))}
      <ErrorMessage error={error} />
      <div className="flex items-center gap-3 pt-3.5 text-xs font-medium text-slate-400" aria-hidden>
        <span className="h-px flex-1 bg-slate-200" />
        {t.auth.social.or}
        <span className="h-px flex-1 bg-slate-200" />
      </div>
    </div>
  )
}
