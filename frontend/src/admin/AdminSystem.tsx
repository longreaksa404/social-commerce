import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx'
import { errorText } from '../lib/errors.ts'
import { SUPPORT_TELEGRAM } from '../lib/support.ts'
import type { AdminSystem as System } from '../lib/types.ts'
import { useAdminSystem, useConnectBotAgain, useRunJob } from './queries.ts'
import { ago } from './shared.ts'

const ms = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`)
const mb = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`)
// Slower than this for 1 in 20 requests reads in amber.
const SLOW_MS = 1000

const EVENT: Record<string, string> = {
  new_order: 'New order alert',
  low_stock: 'Low stock alert',
  payment_claimed: 'A customer says paid',
  plan_reminder: 'Plan reminder',
  opened_by_oak: 'Opened by Oak Order',
}

/** /admin/system (parts 24 to 27, founder's pick 12B with "Look deeper",
 * 2026-10-28): six tiles say at a glance if anything is wrong, each one
 * jumping to its detail below; then where to look deeper (Sentry, Render,
 * Neon, Cloudflare, cron-job.org, GitHub). Fresh every 30 seconds. */
export function AdminSystem() {
  const system = useAdminSystem()
  return (
    <>
      <title>System · Oak Order admin</title>
      <PageHeader title="System" />
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

function Page({ system }: { system: System }) {
  const { speed, bot } = system
  const late = system.jobs.filter((j) => j.late)
  const services = [...system.services, { name: 'Support Telegram (app)', set: Boolean(SUPPORT_TELEGRAM) }]
  const unset = services.filter((s) => !s.set)
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile to="#speed" label="Speed, last hour" value={speed.typical_ms === null ? '—' : ms(speed.typical_ms)}>
          {speed.slow_ms === null ? (
            'No requests yet'
          ) : (
            <span className={speed.slow_ms > SLOW_MS ? 'text-amber-700' : undefined}>Slowest 1 in 20: {ms(speed.slow_ms)}</span>
          )}
        </Tile>
        <Tile to="#speed" label="Errors today" value={speed.errors_today}>
          <span className={speed.errors_hour > 0 ? 'text-red-700' : undefined}>{speed.errors_hour} in the last hour</span>
        </Tile>
        <Tile to="#jobs" label="Daily jobs" value={late.length === 0 ? 'All ran' : <span className="text-amber-700">{late.length} late</span>}>
          {late.length === 0 ? system.jobs.map((j) => j.title).join(', ') : late.map((j) => j.title).join(', ')}
        </Tile>
        <Tile
          to="#bot"
          label="Telegram bot"
          value={!bot.set_up ? 'Not set up' : bot.working ? 'Working' : <span className="text-amber-700">Problem</span>}
        >
          <span className={bot.failed > 0 ? 'text-amber-700' : undefined}>
            {bot.failed === 1 ? '1 failed send' : `${bot.failed} failed sends`}, 24 h
          </span>
        </Tile>
        <Tile to="#database" label="Database" value={mb(system.database_bytes)}>
          Answers in {ms(system.database_ms)}
        </Tile>
        <Tile to="#services" label="Services" value={`${services.length - unset.length} of ${services.length} set`}>
          {unset.length === 0 ? 'All set' : `${unset.map((s) => s.name).join(', ')} not set`}
        </Tile>
      </div>

      <Group id="speed" title="Speed and errors">
        <Rows
          rows={[
            ['Requests, last hour', speed.requests.toLocaleString('en-US')],
            ['Typical answer', speed.typical_ms === null ? '—' : ms(speed.typical_ms)],
            [
              'Slowest 1 in 20',
              speed.slow_ms === null ? '—' : (
                <span key="slow" className={speed.slow_ms > SLOW_MS ? 'text-amber-700' : undefined}>
                  {ms(speed.slow_ms)}
                  {speed.slow_route && <span className="text-slate-500"> · {speed.slow_route}</span>}
                </span>
              ),
            ],
            ['Errors', `${speed.errors_hour} in the last hour · ${speed.errors_today} today`],
            ['Server up since', `${new Date(speed.started_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (${ago(speed.started_at)})`],
          ]}
        />
        <p className="mt-2 text-xs text-slate-500 sm:px-1">Counted by the server since it started; Render restarts it after a deploy or a quiet spell.</p>
      </Group>

      <Group id="jobs" title="Daily jobs">
        <ul className={`${cardClass} divide-y divide-slate-100`}>
          {system.jobs.map((job) => (
            <Job key={job.name} job={job} />
          ))}
        </ul>
      </Group>

      <Group id="bot" title="Telegram bot">
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
        {bot.set_up && !bot.webhook && <ConnectAgain />}
        {bot.recent.length > 0 && (
          <ul className={`${cardClass} mt-3 divide-y divide-slate-100`}>
            {bot.recent.map((send, i) => (
              <li key={i} className="px-4 py-3 text-sm">
                <Link to={`/admin/shops/${send.store_id}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">
                  {send.shop}
                </Link>
                <span className="text-slate-500"> · {EVENT[send.event_type] ?? send.event_type} · {ago(send.sent_at)}</span>
                {send.error && <p className="text-amber-700">{send.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </Group>

      <Group id="database" title="Database">
        <Rows
          rows={[
            ['Size', mb(system.database_bytes)],
            ['Answers in', ms(system.database_ms)],
          ]}
        />
      </Group>

      <Group id="services" title="Services">
        <Rows rows={services.map((s) => [s.name, s.set ? 'Set' : <span key={s.name} className="text-slate-500">Not set</span>])} />
        <p className="mt-2 text-xs text-slate-500 sm:px-1">Names only: keys are never shown here.</p>
      </Group>

      <Group id="version" title="Version">
        <Rows rows={[['Live API', system.version ? <code key="v" className="font-mono">{system.version}</code> : 'Not on Render (local)']]} />
      </Group>

      <Group id="deeper" title="Look deeper">
        <ul className={`${cardClass} divide-y divide-slate-100`}>
          {DEEPER.map(([name, href, what]) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-700">{name}</span>
                  <span className="block text-slate-500">{what}</span>
                </span>
                <ExternalLink aria-hidden className="size-4 shrink-0 text-slate-400" />
              </a>
            </li>
          ))}
        </ul>
      </Group>
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

function Tile({ to, label, value, children }: { to: string; label: string; value: ReactNode; children: ReactNode }) {
  return (
    <a
      href={to}
      className={`${cardClass} block p-4 transition hover:ring-slate-900/15 focus-visible:outline-2 focus-visible:outline-navy-600 sm:p-5`}
    >
      <span className="block text-sm text-slate-500">{label}</span>
      <span className="mt-1 block text-xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-2xl">{value}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{children}</span>
    </a>
  )
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={title} className="max-w-3xl scroll-mt-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{title}</h2>
      {children}
    </section>
  )
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className={`${cardClass} divide-y divide-slate-100`}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-4 px-4 py-3 text-sm">
          <dt className="w-32 shrink-0 text-slate-500 sm:w-44">{label}</dt>
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
    <div className="mt-3 flex flex-wrap items-center gap-3 sm:px-1">
      <span className="flex-1 text-sm text-amber-700">Telegram isn't sending the bot's messages here.</span>
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
    </div>
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
        <p className={job.late ? 'text-amber-700' : 'text-slate-500'}>
          {job.every === 'daily' ? 'Daily' : 'Hourly'} ·{' '}
          {job.last_at ? `last ran ${ago(job.last_at)} · ${job.last_sent === 1 ? '1 sent' : `${job.last_sent} sent`}` : 'never ran on this server'}
        </p>
      </div>
      <Button variant="secondary" loading={run.isPending} onClick={ask}>
        Run now
      </Button>
    </li>
  )
}
