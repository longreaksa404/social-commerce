import { CircleCheck, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buttonClass } from '../components/styles.ts'
import { Button, ErrorMessage } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { ApiError } from '../lib/api.ts'
import { formatPhone } from '../lib/orders.ts'
import type { CartLine } from './cart.ts'
import {
  pendingLogin,
  saveTelegramCustomer,
  sendCartWithLogin,
  setPendingLogin,
  useNewTelegramLogin,
  useTelegramLoginResult,
  type ShopCustomer,
} from './telegramLogin.ts'

/** "Continue with Telegram" at checkout (founder, 2026-10-20): a plain
 * link to Oak's bot (the check is made ahead), then "share your phone in
 * Telegram, then come back" while the page waits; once the bot has the
 * phone the device is logged in and `onLoggedIn` fills in the details.
 * Outlined, not dark: Place order stays the one dark button on the page. */
export function ContinueWithTelegram({
  shop,
  lines,
  onLoggedIn,
}: {
  shop: string
  lines: CartLine[]
  onLoggedIn: (customer: ShopCustomer) => void
}) {
  const c = useT().checkout.telegram
  const [resumed, setResumed] = useState(() => pendingLogin(shop))
  const [opened, setOpened] = useState(resumed !== null)
  const created = useNewTelegramLogin(shop, lines, resumed === null)
  const check = resumed ?? created.data
  const result = useTelegramLoginResult(shop, check?.id, opened)
  const done = result.data?.customer ?? null

  useEffect(() => {
    if (!done) return
    setPendingLogin(shop, null)
    saveTelegramCustomer({ token: done.token, name: done.name, phone: done.phone })
    onLoggedIn(done)
  }, [done, shop, onLoggedIn])

  function startOver() {
    setPendingLogin(shop, null)
    setResumed(null)
    setOpened(false)
    void created.refetch()
  }

  const expired = result.error instanceof ApiError && result.error.code === 'LOGIN_EXPIRED'
  if (created.error && !check) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={created.error} />
        <Button variant="secondary" icon={RotateCcw} onClick={() => created.refetch()} className="w-full">
          {c.again}
        </Button>
      </div>
    )
  }
  if (expired) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={result.error} />
        <Button variant="secondary" icon={RotateCcw} onClick={startOver} className="w-full">
          {c.again}
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
        onClick={() => {
          if (!check) return
          setOpened(true)
          setPendingLogin(shop, check)
          sendCartWithLogin(shop, check.id, lines)
        }}
        className={`${buttonClass('secondary', 'lg')} w-full ${check ? '' : 'pointer-events-none opacity-50'}`}
      >
        <Send aria-hidden className="size-4" />
        {c.continue}
      </a>
      <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500" aria-live="polite">
        {opened && <LoaderCircle aria-hidden className="mt-0.5 size-3.5 shrink-0 animate-spin" />}
        {opened ? c.waiting : c.hint}
      </p>
    </div>
  )
}

/** Logged in: the phone Telegram proved, with "Not you?" to log out. */
export function TelegramDetails({ phone, onLogOut }: { phone: string; onLogOut: () => void }) {
  const c = useT().checkout.telegram
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
      <CircleCheck aria-hidden className="size-5 shrink-0 text-emerald-600" />
      <p className="min-w-0 flex-1 text-sm leading-5">
        <span className="block font-semibold text-slate-900 tabular-nums">{formatPhone(phone)}</span>
        <span className="block text-xs font-medium text-emerald-700">{c.confirmed}</span>
      </p>
      <button
        type="button"
        onClick={onLogOut}
        className="-my-2 -mr-2 min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-navy-700 link"
      >
        {c.notYou}
      </button>
    </div>
  )
}

/** "or type your details", between the Telegram button and the fields. */
export function OrTypeDetails() {
  const c = useT().checkout.telegram
  return (
    <p className="flex items-center gap-3 text-xs text-slate-500">
      <span aria-hidden className="h-px flex-1 bg-slate-200" />
      {c.or}
      <span aria-hidden className="h-px flex-1 bg-slate-200" />
    </p>
  )
}
