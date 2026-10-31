import { useState, type ReactNode } from 'react'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, ErrorMessage, ErrorState, Field, Input, MoneyInput, PageHeader, Skeleton } from '../components/ui.tsx'
import { errorText } from '../lib/errors.ts'
import type { AdminSettings as Settings } from '../lib/types.ts'
import { useAdminSettings, useSaveSettings } from './queries.ts'
import { date } from './shared.ts'
import { Sheet } from './ui.tsx'
import { usePasswordAgain } from './usePasswordAgain.tsx'

type Form = { month: string; year: string; trial_days: string; khr_per_usd: string }

const formOf = (s: Settings): Form => ({ month: s.month, year: s.year, trial_days: String(s.trial_days), khr_per_usd: String(s.khr_per_usd) })
const usd = (amount: string) => `$${Number(amount).toFixed(2).replace(/\.00$/, '')}`

/** /admin/settings (part 23 and D2B, founder's pick 11A, 2026-10-28):
 * Oak Order's own numbers on one page with one Save, nothing changed until
 * then. Save says who a change reaches, asks for the password again, and
 * each change goes in the log. */
export function AdminSettings() {
  const settings = useAdminSettings()
  return (
    <>
      <title>Settings · Oak Order admin</title>
      <PageHeader title="Settings" subtitle={settings.data?.updated_at ? `Last changed ${date(settings.data.updated_at)}` : undefined} />
      {settings.isPending ? (
        <Skeleton className="h-96 w-full max-w-2xl rounded-2xl" />
      ) : settings.error ? (
        <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
      ) : (
        <SettingsForm settings={settings.data} />
      )}
    </>
  )
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { toast } = useFeedback()
  const save = useSaveSettings()
  const { guard, sheet } = usePasswordAgain()
  const [form, setForm] = useState<Form>(() => formOf(settings))
  const [asking, setAsking] = useState(false)
  const saved = formOf(settings)

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))
  const priceChanged = Number(form.month) !== Number(saved.month) || Number(form.year) !== Number(saved.year)
  const trialChanged = Number(form.trial_days) !== Number(saved.trial_days)
  const rateChanged = Number(form.khr_per_usd) !== Number(saved.khr_per_usd)
  const dirty = priceChanged || trialChanged || rateChanged
  const valid =
    Number(form.month) > 0 && Number(form.year) > 0 && Number(form.trial_days) >= 1 && Number(form.trial_days) <= 365 && Number(form.khr_per_usd) >= 1000 && Number(form.khr_per_usd) <= 10000

  async function confirmSave() {
    try {
      const done = await guard(() =>
        save.mutateAsync({
          month: Number(form.month).toFixed(2),
          year: Number(form.year).toFixed(2),
          trial_days: Number(form.trial_days),
          khr_per_usd: Number(form.khr_per_usd),
        }),
      )
      if (done) {
        setAsking(false)
        toast('Saved · in the log')
      }
    } catch (error) {
      toast(errorText(error), 'error')
    }
  }

  const reach: string[] = []
  if (priceChanged) {
    const who =
      settings.paying_shops === 0 ? 'No shop is paying yet.' : `${settings.paying_shops === 1 ? '1 paying shop pays' : `${settings.paying_shops} paying shops pay`} them from their next payment.`
    reach.push(`${usd(form.month)} a month or ${usd(form.year)} a year. ${who} The Terms' Fees show them from today.`)
  }
  if (trialChanged) reach.push(`Shops opened from now get ${form.trial_days} days free.`)
  if (rateChanged) reach.push(`The next currency switch converts at $1 = ${Number(form.khr_per_usd).toLocaleString('en-US')}៛.`)

  return (
    <div className="max-w-2xl space-y-6 pb-24">
      <Group title="Plan">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Month">
            <MoneyInput currency="USD" required value={form.month} onChange={set('month')} />
          </Field>
          <Field label="Year" hint="From each shop's next payment.">
            <MoneyInput currency="USD" required value={form.year} onChange={set('year')} />
          </Field>
        </div>
        <Field label="Free trial" hint="For shops opened from now." className="max-w-56">
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            max="365"
            trailing={<span className="text-sm text-slate-500">days</span>}
            value={form.trial_days}
            onChange={(e) => set('trial_days')(e.target.value)}
          />
        </Field>
      </Group>
      <Group title="Currency">
        <Field label="Riel rate" hint="Used when a shop switches currency." className="max-w-56">
          <Input
            type="number"
            inputMode="numeric"
            min="1000"
            max="10000"
            leading={<span className="text-sm font-medium">$1 =</span>}
            trailing={<span className="text-sm text-slate-500">៛</span>}
            value={form.khr_per_usd}
            onChange={(e) => set('khr_per_usd')(e.target.value)}
          />
        </Field>
      </Group>

      {dirty && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-20 flex items-center gap-2 rounded-2xl bg-surface py-2 pr-2 pl-4 shadow-xl ring-1 ring-slate-900/10 lg:sticky lg:inset-x-auto lg:bottom-4">
          <span className="flex-1 text-sm font-semibold text-slate-900">Not saved</span>
          <Button variant="secondary" onClick={() => setForm(saved)}>
            Undo
          </Button>
          <Button disabled={!valid} onClick={() => setAsking(true)}>
            Save
          </Button>
        </div>
      )}

      <Sheet open={asking} onClose={() => setAsking(false)} title="Save the new settings?">
        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
          {reach.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <ErrorMessage error={save.error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setAsking(false)}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={confirmSave}>
            Save
          </Button>
        </div>
      </Sheet>
      {sheet}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{title}</h2>
      <div className={`${cardClass} space-y-4 p-4 sm:p-5`}>{children}</div>
    </section>
  )
}
