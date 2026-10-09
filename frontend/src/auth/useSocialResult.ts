import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { saveSignup } from '../lib/signup.ts'
import type { SocialResult } from '../lib/types.ts'
import { useAuth } from './useAuth.ts'

/** After any "Continue with ...": logged in, or off to set up the shop
 * (/register/finish). Used by the buttons and by the Facebook / TikTok
 * callback. */
export function useSocialResult() {
  const { startSession } = useAuth()
  const navigate = useNavigate()
  return useCallback(
    (result: SocialResult) => {
      if (result.access_token) {
        startSession({ access_token: result.access_token })
        navigate('/dashboard', { replace: true })
      } else if (result.signup) {
        saveSignup(result.signup)
        navigate('/register/finish', { replace: true, state: result.signup })
      }
    },
    [navigate, startSession],
  )
}
