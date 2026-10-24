import { useMutation } from '@tanstack/react-query'
import { LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '../components/styles.ts'
import { Button, ErrorMessage } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api, ApiError, type AccessToken } from '../lib/api.ts'
import { formatPhone } from '../lib/orders.ts'
import { useAuth } from './useAuth.ts'
import { usePhoneCheck } from './usePhoneCheck.ts'

/** "Log in with Telegram", first on Log in (founder's test list #30,
 * 2026-10-24): open the bot, share the number, come back, logged in. For
 * shop owners; staff log in with their password (#25), and the owner's
 * password stays too (#29). A number with no shop gets Create your shop. */
export function TelegramLogIn({ onLoggedIn }: { onLoggedIn: () => void }) {
  const block = useBlock(onLoggedIn)
  const t = useT()
  if (block === null) return null
  return (
    <>
      {block}
      <p className="my-5 flex items-center gap-3 text-sm text-slate-500 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">
        {t.auth.telegramLogin.orPassword}
      </p>
    </>
  )
}

/** The button and what follows it; null where the bot isn't set up (503):
 * then Log in is only the password form, as before. */
function useBlock(onLoggedIn: () => void) {
  const { startSession } = useAuth()
  const { check, created, read, done, opened, setOpened, startOver, expired } = usePhoneCheck()
  const t = useT()
  const p = t.auth.phoneCheck
  const l = t.auth.telegramLogin

  const logIn = useMutation({
    mutationFn: (phoneCheck: string) =>
      api<AccessToken>('/auth/telegram', { method: 'POST', body: { phone_check: phoneCheck }, auth: false }),
    onSuccess: (token) => {
      startSession(token)
      onLoggedIn()
    },
  })
  const { mutate, reset } = logIn
  const doneId = done?.id
  useEffect(() => {
    if (doneId) mutate(doneId)
  }, [doneId, mutate])

  function again() {
    reset()
    startOver()
  }

  const code = logIn.error instanceof ApiError ? logIn.error.code : null
  if (done && (code === 'NO_SHOP_FOR_PHONE' || code === 'STAFF_USE_PASSWORD')) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-300 px-4 py-3">
        <p>
          <span className="block font-semibold text-slate-900 tabular-nums">{formatPhone(done.phone ?? '')}</span>
          <span className="block text-sm font-medium text-amber-700">
            {code === 'NO_SHOP_FOR_PHONE' ? l.noShop : l.staff}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {code === 'NO_SHOP_FOR_PHONE' && (
            <Link to="/register" className={buttonClass('primary')}>
              {t.auth.createYourStore}
            </Link>
          )}
          <button type="button" onClick={again} className="min-h-11 text-sm font-medium text-navy-700 link">
            {p.another}
          </button>
        </div>
      </div>
    )
  }
  if (done && !logIn.error) {
    return (
      <p role="status" className="flex min-h-12 items-center justify-center gap-2 text-sm font-medium text-slate-700">
        <LoaderCircle aria-hidden className="size-5 animate-spin" />
        {l.loggingIn}
      </p>
    )
  }
  if (created.error instanceof ApiError && created.error.status === 503) return null
  if (created.error || expired || logIn.error) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={logIn.error ?? created.error ?? read.error} />
        <Button variant="secondary" icon={RotateCcw} onClick={again} className="w-full">
          {p.again}
        </Button>
      </div>
    )
  }
  return (
    <div>
      <a
        href={check?.telegram_url}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!check}
        onClick={() => setOpened(true)}
        className={`${buttonClass(opened ? 'secondary' : 'primary', 'lg')} w-full ${check ? '' : 'pointer-events-none opacity-50'}`}
      >
        <Send aria-hidden className="size-4" />
        {l.button}
      </a>
      <p aria-live="polite" className="mt-2 text-xs leading-5 text-slate-500">
        {opened ? p.waiting : p.hint}
      </p>
    </div>
  )
}
