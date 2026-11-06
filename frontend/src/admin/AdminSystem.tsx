import { ChevronDown, ExternalLink } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, ErrorState, Skeleton } from '../components/ui.tsx'
import { errorText } from '../lib/errors.ts'
import { SUPPORT_TELEGRAM } from '../lib/support.ts'
import type { AdminSystem as System } from '../lib/types.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { useAdminSystem, useConnectBotAgain, useRunJob } from './queries.ts'
import { ago, dayMonth, dayTime, ppDay } from './shared.ts'

const ms = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`)
const mb = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`)
// Slower than this for 1 request in 20 reads amber.
const SLOW_MS = 1000

const EVENT: Record<string, string> = {
  new_order: 'New order alert',
  low_stock: 'Low stock alert',
  payment_claimed: 'A customer says paid',
  plan_reminder: 'Plan reminder',
  opened_by_oak: 'Opened by Oak Order',
}

type Tone = 'red' | 'amber' | 'ok' | 'off'
const TONE_CLASS: Record<Tone, string> = { red: 'text-red-700', amber: 'text-amber-700', ok: 'text-slate-500', off: 'text-slate-500' }
const RANK: Record<Tone, number> = { red: 0, amber: 1, ok: 2, off: 3 }

/** One part of the system: a state word, its key value, its actions and
 * its details (opened in place). `id` matches the bell's links (#jobs). */
type Part = { id: string; name: string; state: string; tone: Tone; value: ReactNode; actions?: ReactNode; details?: ReactNode }

/** /admin/system (parts 24 to 27, pick 12B with "Look deeper"; redesign
 * pick 12A, 2026-11-06): one line per part, sorted so anything failing or
 * late is on top, each with its state in a word (red and amber on the
 * word only), its key value and Details that open in place; a bell
 * notice (#jobs, #backup…) opens its part. Then where to look deeper.
 * Fresh every 30 seconds. */
export function AdminSystem() {
  const system = useAdminSystem()
  return (
    <>
      <title>System · Oak Order admin</title>
      <AdminPageHeader title="System" subtitle="Fresh every 30 seconds · Phnom Penh time" />
      {system.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : system.error ? (
        <ErrorState error={system.error} onRetry={() => system.refetch()} />
      ) : (
        <Page system={system.data} />
      )}
    </>
  )
}

/** The nightly backup in words, and how it reads: never "fine" until a
 * night has reported. */
function backupWords(backup: System['backup']): { text: string; tone: Tone } {
  if (backup.failing) return { text: `Last night failed ${backup.failed_at ? ago(backup.failed_at) : ''}`.trim(), tone: 'red' }
  if (!backup.last_at) return { text: 'No backup reported yet', tone: 'amber' }
  if (backup.late) return { text: `Late · last saved ${ago(backup.last_at)}`, tone: 'amber' }
  return { text: `Saved ${ago(backup.last_at)}`, tone: 'ok' }
}

/** A navy bar of how much of an allowance is used; its words carry the
 * warning colour (red and amber on words only). */
function Meter({ used, limit }: { used: number; limit: number }) {
  return (
    <span aria-hidden className="mt-1.5 block h-1.5 max-w-64 overflow-hidden rounded-full bg-slate-100">
      <span className="block h-full rounded-full bg-navy-700" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
    </span>
  )
}

function Page({ system }: { system: System }) {
  const { speed, bot, backup } = system
  const late = system.jobs.filter((j) => j.late && !j.failing)
  const failing = system.jobs.filter((j) => j.failing)
  const backupNow = backupWords(backup)
  const services = [...system.services, { name: 'Support Telegram (app)', set: Boolean(SUPPORT_TELEGRAM) }]
  const unset = services.filter((s) => !s.set)
  const hours = system.server_hours
  const compute = system.database_compute
  const slow = speed.slow_ms !== null && speed.slow_ms > SLOW_MS

  const list: Part[] = [
    {
      id: 'jobs',
      name: 'Daily jobs',
      state: failing.length ? `${failing.length} failed` : late.length ? `${late.length} late` : 'OK',
      tone: failing.length ? 'red' : late.length ? 'amber' : 'ok',
      value:
        failing.length + late.length > 0
          ? [...failing, ...late].map((j) => `${j.title}: ${j.last_at ? `last ran ${ago(j.last_at)}` : 'never ran'}`).join(' · ')
          : system.jobs.map((j) => `${j.title} ${j.last_at ? ago(j.last_at) : 'never'}`).join(' · '),
      details: (
        <ul className="divide-y divide-slate-100">
          {system.jobs.map((job) => (
            <Job key={job.name} job={job} />
          ))}
        </ul>
      ),
    },
    {
      id: 'backup',
      name: 'Nightly backup',
      state: backupNow.tone === 'red' ? 'Failed' : backupNow.tone === 'amber' ? 'Late' : 'OK',
      tone: backupNow.tone,
      value: (
        <>
          {backupNow.text}
          {backup.last_at && backup.bytes ? ` · ${mb(backup.bytes)}` : ''}
        </>
      ),
      details: (
        <Rows
          rows={[
            ...(backup.last_at ? ([['Last saved', dayTime(backup.last_at)]] as [string, ReactNode][]) : []),
            ...(backup.failed_at ? ([['Last failure', <span key="f" className={backup.failing ? 'text-red-700' : undefined}>{ago(backup.failed_at)}</span>]] as [string, ReactNode][]) : []),
            ['When', 'Every night at 02:00, by GitHub'],
            ['Kept', '30 nights, in a private R2 bucket'],
            ['Restore tried', '4 Oct 2026, on a local copy'],
            ['Setup and restore', 'docs/BACKUPS.md'],
          ]}
        />
      ),
    },
    {
      id: 'bot',
      name: 'Telegram bot',
      state: !bot.set_up ? 'Not set up' : !bot.working ? 'Problem' : bot.failed > 0 ? `${bot.failed} failed` : bot.refused > 0 ? 'Refused' : 'OK',
      tone: !bot.set_up ? 'off' : !bot.working || bot.failed > 0 || bot.refused > 0 ? 'amber' : 'ok',
      value: !bot.set_up
        ? 'Not set up on this server'
        : `${bot.working ? 'Working' : (bot.problem ?? 'Not answering')} · ${bot.failed === 1 ? '1 failed send' : `${bot.failed} failed sends`} in 24 h`,
      actions: bot.set_up && !bot.webhook ? <ConnectAgain /> : undefined,
      details: (
        <>
          <Rows
            rows={[
              ['State', !bot.set_up ? 'Not set up on this server' : bot.working ? 'Working' : <span key="p" className="text-amber-700">{bot.problem ?? 'Not answering'}</span>],
              ...(bot.set_up ? ([['Waiting at Telegram', String(bot.waiting)]] as [string, ReactNode][]) : []),
              ['Failed sends, 24 h', String(bot.failed)],
              ...(bot.refused > 0
                ? ([['Changed words refused, 24 h', <span key="r" className="text-amber-700">{bot.refused}, sent in the original words</span>]] as [string, ReactNode][])
                : []),
            ]}
          />
          {bot.set_up && !bot.webhook && <p className="border-t border-slate-100 px-4 py-3 text-sm text-amber-700">Telegram isn't sending the bot's messages here.</p>}
          {bot.recent.length > 0 && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {bot.recent.map((send, i) => (
                <li key={i} className="px-4 py-3 text-sm">
                  <Link to={`/admin/shops/${send.store_id}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">
                    {send.shop}
                  </Link>
                  <span className="text-slate-500">
                    {' '}
                    · {EVENT[send.event_type] ?? send.event_type} · {ago(send.sent_at)}
                  </span>
                  {send.error && <p className="break-words text-amber-700">{send.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    },
    {
      id: 'speed',
      name: 'Speed and errors',
      state: speed.errors_hour > 0 ? 'Errors' : hours?.over ? 'Hours used' : slow || hours?.low ? 'Slow' : 'OK',
      tone: speed.errors_hour > 0 || hours?.over ? 'red' : slow || hours?.low ? 'amber' : 'ok',
      value: (
        <>
          {speed.typical_ms === null ? 'No requests yet' : `${ms(speed.typical_ms)} typical`}
          {speed.slow_ms !== null && (
            <>
              {' · slowest 1 in 20: '}
              <span className={slow ? 'text-amber-700' : undefined}>{ms(speed.slow_ms)}</span>
            </>
          )}
          {' · '}
          <span className={speed.errors_hour > 0 ? 'text-red-700' : undefined}>
            {speed.errors_hour} errors in the last hour, {speed.errors_today} today
          </span>
          {hours && (
            <span className="block">
              <span className={hours.over ? 'text-red-700' : hours.low ? 'text-amber-700' : undefined}>
                Free server hours: about {Math.round(hours.used)} of {hours.limit}
                {hours.on_pace !== null && ` · on pace for ${hours.on_pace}`}
              </span>
              {!hours.from_month_start && <span className="text-slate-500"> · counted since {dayMonth(ppDay(hours.counted_from))}</span>}
              <Meter used={hours.used} limit={hours.limit} />
            </span>
          )}
        </>
      ),
      details: (
        <>
          <Rows
            rows={[
              ['Requests, last hour', speed.requests.toLocaleString('en-US')],
              ['Typical answer', speed.typical_ms === null ? '—' : ms(speed.typical_ms)],
              [
                'Slowest 1 in 20',
                speed.slow_ms === null ? '—' : (
                  <span key="slow" className={slow ? 'text-amber-700' : undefined}>
                    {ms(speed.slow_ms)}
                    {speed.slow_route && <span className="text-slate-500"> · {speed.slow_route}</span>}
                  </span>
                ),
              ],
              ['Errors', `${speed.errors_hour} in the last hour · ${speed.errors_today} today`],
              ['Server up since', `${dayTime(speed.started_at)} (${ago(speed.started_at)})`],
            ]}
          />
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">Counted by the server since it started; Render restarts it after a deploy or a quiet spell.</p>
        </>
      ),
    },
    {
      id: 'database',
      name: 'Database',
      state: compute && !compute.readable ? "Couldn't read" : compute?.over ? 'Nearly used' : compute?.low ? 'Running low' : 'OK',
      tone: compute && !compute.readable ? 'amber' : compute?.over ? 'red' : compute?.low ? 'amber' : 'ok',
      value: (
        <>
          {mb(system.database_bytes)} · answers in {ms(system.database_ms)}
          {compute && (
            <span className="block">
              {!compute.readable || compute.used === null ? (
                <span className="text-amber-700">Couldn't read Neon</span>
              ) : (
                <>
                  <span className={compute.over ? 'text-red-700' : compute.low ? 'text-amber-700' : undefined}>
                    Compute: about {Math.round(compute.used)} of {compute.limit} hours this month
                    {compute.on_pace !== null && ` · on pace for ${compute.on_pace}`}
                  </span>
                  <Meter used={compute.used} limit={compute.limit} />
                </>
              )}
            </span>
          )}
        </>
      ),
    },
    {
      id: 'services',
      name: 'Services',
      state: unset.length ? `${unset.length} not set` : 'OK',
      tone: unset.length ? 'off' : 'ok',
      value: `${services.length - unset.length} of ${services.length} set${unset.length ? ` · ${unset.map((s) => s.name).join(', ')} not set` : ''}`,
      details: (
        <>
          <Rows rows={services.map((s) => [s.name, s.set ? 'Set' : <span key={s.name} className="text-slate-500">Not set</span>])} />
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">Names only: keys are never shown here.</p>
        </>
      ),
    },
    {
      id: 'version',
      name: 'Version',
      state: 'OK',
      tone: 'ok',
      value: system.version ? <code className="font-mono">{system.version}</code> : 'Not on Render (local)',
    },
  ]
  const parts = [...list].sort((a, b) => RANK[a.tone] - RANK[b.tone])

  const { hash } = useLocation()
  const target = hash.slice(1)
  // The bell's part (#jobs) opens by itself; Details opens or closes any.
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const isOpen = (id: string) => toggled[id] ?? id === target
  const toggle = (id: string) => setToggled((was) => ({ ...was, [id]: !isOpen(id) }))
  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView()
  }, [target])

  return (
    <div className="space-y-8">
      <ul className={`${cardClass} divide-y divide-slate-100 overflow-hidden`}>
        {parts.map((part) => (
          <li key={part.id} id={part.id} className="scroll-mt-6">
            <div className="grid gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[7rem_10rem_minmax(0,1fr)_auto] sm:items-center">
              <span className={`font-semibold ${TONE_CLASS[part.tone]}`}>{part.state}</span>
              <span className="font-semibold text-slate-900">{part.name}</span>
              <div className="min-w-0 break-words text-slate-700">{part.value}</div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {part.actions}
                {part.details && (
                  <button
                    type="button"
                    aria-expanded={isOpen(part.id)}
                    aria-controls={`${part.id}-details`}
                    onClick={() => toggle(part.id)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 font-semibold text-navy-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600"
                  >
                    {isOpen(part.id) ? 'Less' : 'Details'}
                    <ChevronDown aria-hidden className={`size-4 transition-transform ${isOpen(part.id) ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
            {part.details && isOpen(part.id) && (
              <div id={`${part.id}-details`} className="border-t border-slate-100 bg-slate-50/60">
                {part.details}
              </div>
            )}
          </li>
        ))}
      </ul>

      <section aria-labelledby="deeper">
        <h2 id="deeper" className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">
          Look deeper
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DEEPER.map(([name, href, what]) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={`${cardClass} flex h-full items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-700">{name}</span>
                  <span className="block text-slate-500">{what}</span>
                </span>
                <ExternalLink aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const DEEPER: [string, string, string][] = [
  ['Sentry', 'https://sentry.io/', 'Each error, and which part of a slow request was slow'],
  ['Render', 'https://dashboard.render.com/', "The server's CPU, memory, restarts and logs"],
  ['Neon', 'https://console.neon.tech/', 'Database load and storage'],
  ['Cloudflare', 'https://dash.cloudflare.com/', 'Visitors, the website, photo storage'],
  ['cron-job.org', 'https://console.cron-job.org/', "Each job's history; emails you if the site is down"],
  ['GitHub', 'https://github.com/longreaksa404/social-commerce', 'The code and what was pushed'],
]

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-4 px-4 py-2.5 text-sm">
          <dt className="w-36 shrink-0 text-slate-500 sm:w-44">{label}</dt>
          <dd className="min-w-0 flex-1 break-words text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Telegram has stopped sending the bot's messages to this server (no
 * webhook): point it here again (Bot page, 2026-10-31). */
function ConnectAgain() {
  const { toast } = useFeedback()
  const connect = useConnectBotAgain()
  return (
    <Button
      variant="secondary"
      loading={connect.isPending}
      onClick={() =>
        connect.mutate(undefined, {
          onSuccess: () => toast('Connected · in the log'),
          onError: (error) => toast(errorText(error), 'error'),
        })
      }
    >
      Connect the bot again
    </Button>
  )
}

/** A job with Run now (part 25), which asks first: it sends messages. */
function Job({ job }: { job: System['jobs'][number] }) {
  const { confirm, toast } = useFeedback()
  const run = useRunJob()

  async function ask() {
    const ok = await confirm({
      title: `Run ${job.title.toLowerCase()} now?`,
      message: job.name === 'billing' ? 'Shops due a plan reminder today get it on Telegram.' : 'Customers due a payment reminder get it on Telegram.',
      confirmLabel: 'Run now',
    })
    if (!ok) return
    run.mutate(job.name, {
      onSuccess: ({ sent }) => toast(`Ran · ${sent === 1 ? '1 sent' : `${sent} sent`} · in the log`),
      onError: (error) => toast(errorText(error), 'error'),
    })
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{job.title}</p>
        <p className={job.late && !job.failing ? 'text-amber-700' : 'text-slate-500'}>
          {job.every === 'daily' ? 'Daily' : 'Hourly'} ·{' '}
          {job.last_at ? `last ran ${ago(job.last_at)} · ${job.last_sent === 1 ? '1 sent' : `${job.last_sent} sent`}` : 'never ran on this server'}
        </p>
        {job.failed_at && (
          <p className={job.failing ? 'text-red-700' : 'text-slate-500'}>
            {job.failing ? 'Last run failed' : 'Failed'} {ago(job.failed_at)}
            {job.error && ` · ${job.error}`}
          </p>
        )}
      </div>
      <Button variant="secondary" loading={run.isPending} onClick={ask}>
        Run now
      </Button>
    </li>
  )
}
