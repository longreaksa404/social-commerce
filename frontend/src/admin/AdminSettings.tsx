import { useState, type ReactNode } from 'react'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, ErrorMessage, ErrorState, Field, Input, MoneyInput, Skeleton } from '../components/ui.tsx'
import { useUnsavedChanges } from '../dashboard/useUnsavedChanges.ts'
import { errorText } from '../lib/errors.ts'
import type { AdminSettings as Settings } from '../lib/types.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { useAdminSettings, useSaveSettings } from './queries.ts'
import { date } from './shared.ts'
import { SaveBar, Sheet } from './ui.tsx'
import { usePasswordAgain } from './usePasswordAgain.tsx'

type Form = { month: string; year: string; trial_days: string; khr_per_usd: string }
const formOf = (s: Settings): Form => ({ month: s.month, year: s.year, trial_days: String(s.trial_days), khr_per_usd: String(s.khr_per_usd) })
const usd = (amount: string) => `$${Number(amount).toFixed(2).replace(/\.00$/, '')}`

/** /admin/settings (part 23 and D2B, founder's pick 11A, 2026-10-28):
 * Oak Order's own numbers on one page with one Save, nothing changed until
 * then. Save says who a change reaches, asks for the password again, and
 * each change goes in the log. Redesign pick 15A (2026-11-06): "When you
 * save" beside the fields says who each change reaches before Save; the
 * Save bar is docked at the bottom (SaveBar); leaving with changes asks
 * first (useUnsavedChanges). */
export function AdminSettings() {
  const settings = useAdminSettings()
  return (
    <>
      <title>Settings · Oak Order admin</title>
      <AdminPageHeader title="Settings" subtitle={settings.data?.updated_at ? `Last changed ${date(settings.data.updated_at)}` : undefined} />
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
  const changes = [priceChanged, trialChanged, rateChanged].filter(Boolean).length
  const dirty = changes > 0
  const valid =
    Number(form.month) > 0 && Number(form.year) > 0 && Number(form.trial_days) >= 1 && Number(form.trial_days) <= 365 && Number(form.khr_per_usd) >= 1000 && Number(form.khr_per_usd) <= 10000
  useUnsavedChanges(dirty && !save.isPending)

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
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(16rem,22rem)]">
        <div className="space-y-6">
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
        </div>
        <section aria-labelledby="when-you-save" className={`${cardClass} p-4 sm:p-5 lg:sticky lg:top-5 lg:mt-7`}>
          <h2 id="when-you-save" className="font-semibold text-slate-900">
            {dirty ? 'When you save' : 'No changes'}
          </h2>
          {dirty ? (
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
              {reach.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Change a number to see who it reaches.</p>
          )}
        </section>
      </div>
      {dirty && (
        <SaveBar>
          <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Not saved · {changes === 1 ? '1 change' : `${changes} changes`}</span>
          <Button variant="secondary" onClick={() => setForm(saved)}>
            Undo
          </Button>
          <Button disabled={!valid} onClick={() => setAsking(true)}>
            Save
          </Button>
        </SaveBar>
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
    </>
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
