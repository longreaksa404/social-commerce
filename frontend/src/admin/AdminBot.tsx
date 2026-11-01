import { Bold, Bot, ChevronRight } from 'lucide-react'
import { Fragment, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { NavLink, useParams } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton, Switch, TextArea } from '../components/ui.tsx'
import { errorText } from '../lib/errors.ts'
import type { AdminBotDraft, AdminBotMessage, AdminBotProfile, AdminBotWord, AdminBotWords } from '../lib/types.ts'
import { useDebounced } from '../lib/useDebounced.ts'
import { useAdminBot, useBotGoLive, useBotPreview, useBotProfile, useBotTest, useSaveBotProfile } from './queries.ts'
import { date } from './shared.ts'
import { Chip, Chips } from './ui.tsx'
import { usePasswordAgain } from './usePasswordAgain.tsx'

const GROUPS = [
  ['sellers', 'To sellers'],
  ['customers', 'To customers'],
  ['you', 'To you'],
] as const
// Who stops getting a message turned off (pick 8A).
const WHO: Record<AdminBotMessage['group'], string> = { sellers: 'shops', customers: 'customers of every shop', you: 'you' }
const PROFILE = 'profile'

/** /admin/bot and /admin/bot/:key (01_PRODUCT.md §22.11; founder's picks
 * 2026-10-31: B1B, turning a message off, design 1A 2A 3A 4B 5A 6A 7A 8A
 * 9B 10A 11A): every message the bot sends in a list, the open one beside
 * it on a laptop (its own page on a phone), its whole text in one box with
 * {tags}, the preview under it, its small words below. Nothing changes
 * until Save (sent to the admin's own Telegram first) and Go live. */
export function AdminBot() {
  const { key } = useParams()
  const bot = useAdminBot()
  const message = bot.data?.messages.find((m) => m.key === key)

  const list = bot.isPending ? (
    <Skeleton className="h-96 w-full rounded-2xl" />
  ) : bot.error ? (
    <ErrorState error={bot.error} onRetry={() => bot.refetch()} />
  ) : (
    <MessageList bot={bot.data} selected={key} />
  )

  let open: ReactNode
  if (key === PROFILE) open = <ProfileEditor />
  else if (!key) open = <EmptyState icon={Bot} title="Pick a message on the left" />
  else if (bot.isPending) open = <Skeleton className="h-96 w-full rounded-2xl" />
  else if (message && bot.data) open = <MessageEditor key={message.key} message={message} words={bot.data.words} />
  else if (bot.data) open = <EmptyState icon={Bot} title="No such message" />

  return (
    <>
      <title>Bot · Oak Order admin</title>
      <div className="lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className={`${key ? 'hidden lg:block' : ''} lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:pb-2`}>
          <PageHeader title="Bot" subtitle={bot.data?.updated_at ? `Last changed ${date(bot.data.updated_at)}` : undefined} />
          {list}
        </div>
        <div className={`${key ? '' : 'hidden lg:block'} min-w-0`}>{open}</div>
      </div>
    </>
  )
}

/** Pick 2A: the messages by who gets them; Changed and Off in words (10A). */
function MessageList({ bot, selected }: { bot: AdminBotWords; selected?: string }) {
  const changedWords = new Set(bot.words.filter((w) => w.text !== w.default).map((w) => w.key))
  return (
    <nav aria-label="Bot messages" className="space-y-5">
      {GROUPS.map(([group, title]) => (
        <ListGroup key={group} title={title}>
          {bot.messages
            .filter((m) => m.group === group)
            .map((m) => {
              const changed = m.text !== m.default || m.words.some((w) => changedWords.has(w))
              return (
                <Row key={m.key} to={`/admin/bot/${m.key}`} on={selected === m.key} title={m.name}>
                  {!m.on ? <span className="text-slate-500">Off</span> : changed && <span className="text-navy-700">Changed</span>}
                </Row>
              )
            })}
        </ListGroup>
      ))}
      <ListGroup title="Profile">
        <Row to={`/admin/bot/${PROFILE}`} on={selected === PROFILE} title="Name, Before Start, About" />
      </ListGroup>
    </nav>
  )
}

function ListGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase sm:px-1">{title}</h2>
      <ul className={`${cardClass} divide-y divide-slate-100 overflow-hidden`}>{children}</ul>
    </section>
  )
}

function Row({ to, on, title, children }: { to: string; on: boolean; title: string; children?: ReactNode }) {
  return (
    <li>
      <NavLink
        to={to}
        className={`flex min-h-11 items-center gap-2 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 ${
          on ? 'bg-navy-50 font-semibold text-navy-700' : 'text-slate-800 hover:bg-slate-50'
        }`}
      >
        <span className="min-w-0 flex-1">{title}</span>
        {children && <span className="shrink-0 text-xs font-semibold">{children}</span>}
        <ChevronRight aria-hidden className="size-4 shrink-0 text-slate-400 lg:hidden" />
      </NavLink>
    </li>
  )
}

type Step = { said: string; ok: boolean }

function MessageEditor({ message, words }: { message: AdminBotMessage; words: AdminBotWord[] }) {
  const { toast } = useFeedback()
  const test = useBotTest()
  const goLive = useBotGoLive()
  const { guard, sheet } = usePasswordAgain()
  const mine = message.words.flatMap((key) => words.filter((w) => w.key === key))
  const savedWords = Object.fromEntries(mine.map((w) => [w.key, w.text]))
  const [text, setText] = useState(message.text)
  const [wordTexts, setWordTexts] = useState<Record<string, string>>(savedWords)
  const [on, setOn] = useState(message.on)
  const [example, setExample] = useState(0)
  // 9B: after Save, what Telegram said, until Go live or Edit more.
  const [step, setStep] = useState<Step | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [askingBack, setAskingBack] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)

  const changedWords = Object.fromEntries(Object.entries(wordTexts).filter(([key, value]) => value !== savedWords[key]))
  const wordsChanged = Object.keys(changedWords).length > 0
  const draft: AdminBotDraft = { key: message.key, text, words: changedWords, on }
  const dirty = text !== message.text || wordsChanged || on !== message.on
  const preview = useBotPreview(JSON.parse(useDebounced(JSON.stringify(draft), 300)) as AdminBotDraft)
  const examples = preview.data?.examples ?? []
  const shown = examples[Math.min(example, examples.length - 1)]
  const errors = preview.data?.errors ?? []
  const atOriginal = text === message.default && mine.every((w) => wordTexts[w.key] === w.default)

  function edit(next: string) {
    setText(next)
    setStep(null)
  }

  function insert(add: string) {
    const el = box.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    edit(text.slice(0, start) + add + text.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + add.length, start + add.length)
    })
  }

  // Pick 5A: ** around the words picked, as Telegram's own bold.
  function bold() {
    const el = box.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    edit(`${text.slice(0, start)}**${text.slice(start, end)}**${text.slice(end)}`)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + 2, end + 2)
    })
  }

  function putBack() {
    edit(message.default)
    setWordTexts(Object.fromEntries(mine.map((w) => [w.key, w.default])))
    setAskingBack(false)
  }

  function undo() {
    edit(message.text)
    setWordTexts(savedWords)
    setOn(message.on)
  }

  // Save, step one (9B): new words go to the admin's own Telegram first;
  // only the switch changed, nothing to read.
  function save() {
    if (text === message.text && !wordsChanged) {
      setStep({ said: on ? 'Turn it back on for everyone?' : `Turn it off for ${WHO[message.group]}?`, ok: true })
      return
    }
    test.mutate(
      { ...draft, example },
      {
        onSuccess: ({ sent, error }) =>
          setStep(
            sent > 0
              ? { said: 'Sent to your Telegram. Does it look right?', ok: true }
              : { said: error ? `Telegram said: ${error}` : "Your Telegram didn't get it: log in to the admin with Telegram once.", ok: false },
          ),
        onError: (error) => setStep({ said: `Not sent to your Telegram: ${errorText(error)}`, ok: false }),
      },
    )
  }

  async function live() {
    try {
      const done = await guard(() => goLive.mutateAsync(draft))
      if (!done) return
      setStep(null)
      toast('Live · in the log')
    } catch (error) {
      toast(errorText(error), 'error')
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <PageHeader title={message.name} subtitle={message.about} back="/admin/bot" backOnPhonesOnly />

      <section aria-label="Sending" className={`${cardClass} px-4 py-2 sm:px-5`}>
        {message.can_off ? (
          <Switch
            checked={on}
            onChange={(next) => {
              setOn(next)
              setStep(null)
            }}
            label="Sending"
            description={!on && message.on ? <span className="text-amber-700">After Go live, {WHO[message.group]} stop getting this.</span> : undefined}
          />
        ) : (
          <p className="flex min-h-11 flex-wrap items-center gap-x-2 text-sm">
            <span className="font-medium text-slate-900">Always on</span>
            <span className="text-slate-500">{message.stays_on}</span>
          </p>
        )}
      </section>

      <section aria-label="The message" className={`${cardClass} space-y-3 p-4 sm:p-5`}>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onMouseDown={(e) => e.preventDefault()} onClick={bold} aria-label="Bold" title="Bold the words picked">
            <Bold aria-hidden className="size-4" />
          </Button>
          <span className="text-xs text-slate-500">A line whose tags are all empty is left out.</span>
        </div>
        <TagBox value={text} onChange={edit} ref={box} label={`${message.name}: the message`} />
        {message.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Add a tag">
            <span className="text-xs text-slate-500">Add:</span>
            {message.tags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(`{${tag.name}}`)}
                className="rounded-lg border border-dashed border-navy-300 px-2 py-0.5 text-xs text-navy-700 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-600"
              >
                <code className="font-mono">{`{${tag.name}}`}</code> {tag.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="link text-sm font-semibold text-navy-700" aria-expanded={showOriginal} onClick={() => setShowOriginal(!showOriginal)}>
            {showOriginal ? 'Hide original' : 'Show original'}
          </button>
          {!atOriginal && (
            <button type="button" className="link text-sm font-semibold text-navy-700" onClick={() => setAskingBack(true)}>
              Back to original
            </button>
          )}
        </div>
        {askingBack && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="flex-1 text-sm text-slate-700">Put the original words back? Then Save.</span>
            <Button variant="secondary" onClick={() => setAskingBack(false)}>
              Keep mine
            </Button>
            <Button onClick={putBack}>Put back</Button>
          </div>
        )}
        {showOriginal && <TextArea readOnly value={message.default} rows={Math.min(14, message.default.split('\n').length + 1)} aria-label="Original words" className="text-slate-500" />}
        {(errors.length > 0 || (preview.data?.warnings.length ?? 0) > 0) && (
          <div className="space-y-1 text-sm">
            {errors.map((line) => (
              <p key={line} className="text-red-700">
                {line}
              </p>
            ))}
            {preview.data?.warnings.map((line) => (
              <p key={line} className="text-amber-700">
                {line}
              </p>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Preview" className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 sm:px-1">{WHO_SEES[message.group]}</h2>
        {examples.length > 1 && (
          <Chips label="Example">
            {examples.map((e, i) => (
              <Chip key={e.label} on={e === shown} onClick={() => setExample(i)}>
                {e.label}
              </Chip>
            ))}
          </Chips>
        )}
        {shown ? <Telegram html={shown.html} buttons={shown.buttons} /> : <Skeleton className="h-40 w-full rounded-2xl" />}
      </section>

      {mine.length > 0 && (
        <section aria-label="Words in this message">
          <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">Words in this message</h2>
          <div className={`${cardClass} divide-y divide-slate-100`}>
            {mine.map((w) => {
              const elsewhere = w.used_in.filter((name) => name !== message.name)
              return (
                <div key={w.key} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-5">
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{w.label}</p>
                    {elsewhere.length > 0 && <p className="text-xs text-slate-500">Also in {elsewhere.join(', ')}</p>}
                    {w.tags.length > 0 && <p className="text-xs text-slate-500">Tags: {w.tags.map((t) => `{${t.name}}`).join(' ')}</p>}
                  </div>
                  <Input
                    aria-label={w.label}
                    value={wordTexts[w.key] ?? ''}
                    onChange={(e) => {
                      setWordTexts({ ...wordTexts, [w.key]: e.target.value })
                      setStep(null)
                    }}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {dirty && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-surface py-2 pr-2 pl-4 shadow-xl ring-1 ring-slate-900/10 lg:sticky lg:inset-x-auto lg:bottom-4">
          {step ? (
            <>
              <span className={`min-w-0 flex-1 text-sm font-semibold ${step.ok ? 'text-slate-900' : 'text-amber-700'}`}>{step.said}</span>
              <Button variant="secondary" onClick={() => setStep(null)}>
                Edit more
              </Button>
              <Button loading={goLive.isPending} onClick={live}>
                Go live
              </Button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Not saved</span>
              <Button variant="secondary" onClick={undo}>
                Undo
              </Button>
              <Button loading={test.isPending} disabled={errors.length > 0} onClick={save}>
                Save
              </Button>
            </>
          )}
        </div>
      )}
      {sheet}
    </div>
  )
}

const WHO_SEES: Record<AdminBotMessage['group'], string> = { sellers: 'Sellers see', customers: 'Customers see', you: 'You see' }

// Pick 3A: the box is a plain text area whose {tags} show coloured: the
// words sit on a layer under a see-through text area with the same font,
// size and padding, so what's typed is exactly what's saved.
const boxText = 'm-0 border-0 px-3.5 py-2.5 text-base leading-6 whitespace-pre-wrap break-words sm:text-sm'

function TagBox({ value, onChange, ref, label }: { value: string; onChange: (value: string) => void; ref: Ref<HTMLTextAreaElement | null>; label: string }) {
  const back = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  // The editor inserts tags and bold at the cursor.
  useImperativeHandle(ref, () => box.current as HTMLTextAreaElement, [])
  // As tall as its words, so the coloured layer never needs to scroll.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <div className="relative rounded-xl border border-slate-300 bg-surface shadow-xs focus-within:border-navy-600 focus-within:ring-4 focus-within:ring-navy-600/15">
      <div ref={back} aria-hidden className={`${boxText} pointer-events-none absolute inset-0 overflow-hidden text-slate-900`}>
        {value.split(/(\{\w*\})/).map((part, i) =>
          /^\{\w*\}$/.test(part) ? (
            <mark key={i} className="rounded bg-navy-50 text-navy-700">
              {part}
            </mark>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
        {value.endsWith('\n') ? ' ' : ''}
      </div>
      <textarea
        ref={box}
        aria-label={label}
        spellCheck={false}
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => back.current && (back.current.scrollTop = e.currentTarget.scrollTop)}
        className={`${boxText} relative block w-full resize-none overflow-hidden bg-transparent text-transparent caret-slate-900 selection:bg-navy-600/25 focus:outline-none`}
      />
    </div>
  )
}

/** Telegram's HTML from the API (escaped text and <b>) as React text,
 * never as markup, in a chat bubble with its buttons under it. */
function Telegram({ html, buttons }: { html: string; buttons: string[] }) {
  let depth = 0
  const parts: ReactNode[] = []
  html.split(/(<\/?b>)/).forEach((part, i) => {
    if (part === '<b>') depth += 1
    else if (part === '</b>') depth = Math.max(0, depth - 1)
    else if (part) {
      const words = part.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
      parts.push(depth > 0 ? <b key={i}>{words}</b> : <Fragment key={i}>{words}</Fragment>)
    }
  })
  return (
    <div className="rounded-2xl bg-navy-50 p-3 sm:p-4">
      <div className="max-w-md space-y-1">
        <p className="rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap text-slate-900 shadow-xs">{parts}</p>
        {buttons.length > 0 && (
          <div className="flex gap-1">
            {buttons.map((label) => (
              <span key={label} className="min-w-0 flex-1 truncate rounded-xl bg-surface/70 px-2 py-1.5 text-center text-sm font-medium text-navy-700">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Pick 11A: the bot's name, the text in an empty chat before Start, and
 * About; one text for everyone (Telegram's app has no Khmer). */
function ProfileEditor() {
  const profile = useBotProfile()
  if (profile.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />
  if (profile.error) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
  return <ProfileForm key={JSON.stringify(profile.data)} profile={profile.data} />
}

const LIMITS = { name: 64, description: 512, short_description: 120 }

function ProfileForm({ profile }: { profile: AdminBotProfile }) {
  const { toast } = useFeedback()
  const save = useSaveBotProfile()
  const { guard, sheet } = usePasswordAgain()
  const [form, setForm] = useState({ name: profile.name, description: profile.description, short_description: profile.short_description })
  const dirty = form.name !== profile.name || form.description !== profile.description || form.short_description !== profile.short_description
  const valid = form.name.trim().length > 0 && Object.entries(LIMITS).every(([key, max]) => form[key as keyof typeof LIMITS].length <= max)
  const count = (key: keyof typeof LIMITS) => `${form[key].length} / ${LIMITS[key]}`

  async function confirmSave() {
    try {
      const done = await guard(() => save.mutateAsync(form))
      if (done) toast('Saved · in the log')
    } catch (error) {
      toast(errorText(error), 'error')
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <PageHeader title="Bot profile" subtitle={`@${profile.username} · photo and OPEN app in BotFather`} back="/admin/bot" backOnPhonesOnly />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-label="Profile" className={`${cardClass} space-y-4 p-4 sm:p-5`}>
          <Field label="Name" hint={count('name')}>
            <Input maxLength={LIMITS.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Before Start" hint={count('description')}>
            <TextArea rows={5} maxLength={LIMITS.description} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="About" hint={count('short_description')}>
            <Input maxLength={LIMITS.short_description} value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </Field>
        </section>
        <section aria-label="What people see" className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">{form.name || profile.name}</p>
            <p className="truncate text-xs text-slate-500">{form.short_description || 'bot'}</p>
          </div>
          <div className="grid min-h-56 place-items-center bg-navy-50 p-4">
            <div className="max-w-64 rounded-2xl bg-surface px-4 py-3 text-sm leading-6 break-words whitespace-pre-wrap text-slate-700 shadow-xs">
              <p className="mb-1 font-semibold text-slate-900">What can this bot do?</p>
              {form.description}
            </div>
          </div>
          <p className="border-t border-slate-100 py-2.5 text-center text-sm font-semibold tracking-wide text-navy-700">START</p>
        </section>
      </div>
      {dirty && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-20 flex items-center gap-2 rounded-2xl bg-surface py-2 pr-2 pl-4 shadow-xl ring-1 ring-slate-900/10 lg:sticky lg:inset-x-auto lg:bottom-4">
          <span className="flex-1 text-sm font-semibold text-slate-900">Not saved</span>
          <Button variant="secondary" onClick={() => setForm({ name: profile.name, description: profile.description, short_description: profile.short_description })}>
            Undo
          </Button>
          <Button loading={save.isPending} disabled={!valid} onClick={confirmSave}>
            Save
          </Button>
        </div>
      )}
      {sheet}
    </div>
  )
}
