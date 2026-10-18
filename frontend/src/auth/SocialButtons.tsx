import { useCallback, useId, useState } from 'react'
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

/** Google, Facebook and TikTok as one small row of logos under the phone
 * form, after `label` ("or sign up with", "or log in with"): the phone
 * number is what every shop has, these are a shortcut (founder's pick 1A,
 * sign-up check 2026-10-18; Google, then Facebook, then TikTok). Each
 * shows only once its app is set up; nothing at all when none is. */
export function SocialButtons({ label }: { label: string }) {
  const onResult = useSocialResult()
  const [error, setError] = useState<unknown>(null)
  const [googleFailed, setGoogleFailed] = useState(false)
  const labelId = useId()
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
  const onGoogleFailed = useCallback(() => setGoogleFailed(true), [])

  if (!GOOGLE_CLIENT_ID && others.length === 0) return null
  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
        <span aria-hidden className="h-px flex-1 bg-slate-200" />
        <span id={labelId}>{label}</span>
        <span aria-hidden className="h-px flex-1 bg-slate-200" />
      </div>
      <div role="group" aria-labelledby={labelId} className="flex justify-center gap-3">
        <GoogleButton icon onCredential={onGoogle} onUnavailable={onGoogleFailed} />
        {others.map((provider) => (
          <ProviderButton
            key={provider}
            iconOnly
            provider={provider}
            label={t.auth.social.continueWith(PROVIDER_NAMES[provider])}
            onClick={() => startOAuth(provider, 'login')}
          />
        ))}
      </div>
      {googleFailed && <p className="text-center text-sm text-slate-500">{t.auth.social.unavailable}</p>}
      <ErrorMessage error={error} />
    </div>
  )
}
