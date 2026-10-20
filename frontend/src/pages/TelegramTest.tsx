import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, Card } from '../components/ui.tsx'
import { api } from '../lib/api.ts'
import { drawKhqr } from '../lib/khqrImage.ts'

/** The founder's test of the mini app (2026-10-20, temporary, English
 * only, opened from /minitest in their own shop's bot chat). Each row
 * tries one thing the shop needs inside Telegram; the founder answers the
 * ones only their eyes can check, and the results copy as text to send
 * back. Removed once the mini app is built. */

type WebApp = {
  initData: string
  version: string
  platform: string
  colorScheme: string
  ready: () => void
  expand: () => void
  isVersionAtLeast: (version: string) => boolean
  openLink: (url: string) => void
  openTelegramLink: (url: string) => void
  downloadFile?: (params: { url: string; file_name: string }, callback?: (accepted: boolean) => void) => void
  BackButton: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp }
  }
}

function loadTelegram(): Promise<WebApp | null> {
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp)
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.onload = () => resolve(window.Telegram?.WebApp ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

type Result = { ok: boolean | null; note: string }
const MAPS = 'https://www.google.com/maps?q=11.5564,104.9282'

export function TelegramTest() {
  const [params] = useSearchParams()
  const shop = params.get('shop')
  const [app, setApp] = useState<WebApp | null | undefined>(undefined)
  const [results, setResults] = useState<Record<string, Result>>({})
  const record = (key: string, ok: boolean | null, note = '') => setResults((r) => ({ ...r, [key]: { ok, note } }))
  const image = useMemo(
    () => drawKhqr({ code: 'OAK ORDER MINI APP TEST', name: 'TEST', amount: '$1.00', caption: 'Test QR' }),
    [],
  )

  useEffect(() => {
    loadTelegram().then(async (webApp) => {
      setApp(webApp)
      if (!webApp?.initData) {
        record('A', false, 'Not inside Telegram')
        return
      }
      webApp.ready()
      webApp.expand()
      record('A', true, `Telegram ${webApp.version} · ${webApp.platform} · ${webApp.colorScheme}`)
      try {
        const me = await api<{ first_name: string }>('/telegram/mini-app/check', {
          method: 'POST',
          body: { init_data: webApp.initData },
        })
        record('B', true, `Hello ${me.first_name}`)
      } catch (error) {
        record('B', false, error instanceof Error ? error.message : 'failed')
      }
    })
  }, [])

  async function saveLikeOrderPage() {
    const blob = await new Promise<Blob | null>((resolve) => image.canvas.toBlob(resolve, 'image/png'))
    const file = blob && new File([blob], 'oak-test-qr.png', { type: 'image/png' })
    if (file && /iPhone|iPad/.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
      } catch {
        // closed
      }
      return
    }
    const link = document.createElement('a')
    link.href = image.url
    link.download = 'oak-test-qr.png'
    link.click()
  }

  function saveTelegramWay() {
    if (!app?.downloadFile || !app.isVersionAtLeast('8.0')) {
      record('D', false, `Not in Telegram ${app?.version ?? '?'}`)
      return
    }
    app.downloadFile({ url: `${window.location.origin}/og/oak-order.png`, file_name: 'oak-test.png' }, (accepted) =>
      record('D', null, accepted ? 'Telegram asked to save: did it land in Photos?' : 'Cancelled'),
    )
  }

  function locate() {
    if (!navigator.geolocation) {
      record('E', false, 'No location here')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => record('E', true, `${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`),
      (e) => record('E', false, e.message || `error ${e.code}`),
      { timeout: 15000 },
    )
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText('Oak Order test')
      record('I', true, 'Copied')
    } catch (error) {
      record('I', false, error instanceof Error ? error.message : 'failed')
    }
  }

  async function share() {
    if (typeof navigator.share !== 'function') {
      record('J', false, 'No share here')
      return
    }
    try {
      await navigator.share({ text: 'Oak Order test' })
      record('J', true, 'Shared')
    } catch (error) {
      record('J', false, error instanceof Error ? error.name : 'failed')
    }
  }

  function backButton() {
    if (!app) return
    const done = () => {
      record('K', true, 'Back arrow tapped')
      app.BackButton.hide()
      app.BackButton.offClick(done)
    }
    app.BackButton.onClick(done)
    app.BackButton.show()
    record('K', null, 'Tap the back arrow at the top left')
  }

  const rows: { key: string; title: string; action?: { label: string; run: () => void }; ask?: boolean }[] = [
    { key: 'A', title: 'Opened inside Telegram' },
    { key: 'B', title: 'The server knows who you are' },
    { key: 'C', title: 'Save QR, as the order page does', action: { label: 'Save QR', run: saveLikeOrderPage }, ask: true },
    { key: 'D', title: "Save a picture, Telegram's way", action: { label: 'Save picture', run: saveTelegramWay }, ask: true },
    { key: 'E', title: 'Your location (for the map pin)', action: { label: 'Find me', run: locate } },
    { key: 'F', title: "Open Google Maps, Telegram's way", action: { label: 'Open map', run: () => app?.openLink(MAPS) }, ask: true },
    { key: 'G', title: 'Open Google Maps, as the order page does', action: { label: 'Open map', run: () => window.open(MAPS, '_blank') }, ask: true },
    {
      key: 'H',
      title: 'Open a Telegram chat (like Ask seller)',
      action: { label: 'Open chat', run: () => (window.location.href = 'https://t.me/telegram') },
      ask: true,
    },
    { key: 'I', title: 'Copy text', action: { label: 'Copy', run: copy } },
    { key: 'J', title: 'Share list', action: { label: 'Share', run: share } },
    { key: 'K', title: "Telegram's back arrow", action: { label: 'Show it', run: backButton } },
  ]

  const summary = rows
    .map((row) => {
      const r = results[row.key]
      const mark = r?.ok === true ? '✓' : r?.ok === false ? '✗' : r ? '?' : '-'
      return `${row.key} ${mark} ${row.title}${r?.note ? `: ${r.note}` : ''}`
    })
    .join('\n')

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-slate-900">Mini app test</h1>
      {app === undefined && <p className="text-slate-600">Loading Telegram…</p>}
      <img src={image.url} alt="Test QR" className="mx-auto w-40 rounded-xl border border-slate-200" />
      <Card className="divide-y divide-slate-100">
        {rows.map((row) => {
          const r = results[row.key]
          return (
            <div key={row.key} className="space-y-2 p-4">
              <p className="font-semibold text-slate-900">
                {row.key}. {row.title}
              </p>
              {r && (
                <p className={`text-sm ${r.ok === false ? 'text-red-700' : r.ok ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {r.ok === true ? '✓ ' : r.ok === false ? '✗ ' : ''}
                  {r.note}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {row.action && (
                  <Button variant="secondary" onClick={row.action.run}>
                    {row.action.label}
                  </Button>
                )}
                {row.ask && (
                  <>
                    <Button variant="ghost" onClick={() => record(row.key, true, 'Worked')}>
                      Worked
                    </Button>
                    <Button variant="ghost" onClick={() => record(row.key, false, "Didn't work")}>
                      Didn't
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </Card>
      {shop && (
        <Card className="space-y-2 p-4">
          <p className="font-semibold text-slate-900">L. Your shop inside Telegram</p>
          <p className="text-sm text-slate-600">
            Order something paid by KHQR, pin the map, save the QR. Then send /minitest again to come back.
          </p>
          <Link to={`/shop/${shop}`} className="font-medium text-navy-700 link">
            Open your shop here
          </Link>
        </Card>
      )}
      <Card className="space-y-3 p-4">
        <p className="font-semibold text-slate-900">Results</p>
        <pre className="text-sm whitespace-pre-wrap text-slate-700 select-all">{summary}</pre>
        <Button onClick={() => navigator.clipboard?.writeText(summary)} className="w-full">
          Copy results
        </Button>
      </Card>
    </div>
  )
}
