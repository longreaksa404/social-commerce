import { AlertCircle, ChevronLeft, CircleCheck, Eye, EyeOff, LoaderCircle, RotateCw } from 'lucide-react'
import {
  createContext,
  use,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Link, Outlet, useMatches } from 'react-router'
import type { Messages } from '../i18n/core.ts'
import { useT } from '../i18n/useT.ts'
import { errorText } from '../lib/errors.ts'
import { priceStep } from '../lib/money.ts'
import type { Currency } from '../lib/types.ts'
import { buttonClass, cardClass, type ButtonSize, type ButtonVariant } from './styles.ts'
import { useBump } from './useBump.ts'

// ---------------------------------------------------------------------------
// Form fields. Inputs are 44px tall with 16px text on phones (smaller text
// makes iOS zoom in on focus) and slightly tighter from `sm` up.

type FieldState = { id?: string; invalid: boolean; describedBy?: string }
const FieldContext = createContext<FieldState>({ invalid: false })

const control =
  'block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-base leading-6 text-slate-900 shadow-xs ' +
  'placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-4 ' +
  'disabled:bg-slate-100 disabled:text-slate-500 sm:py-2 sm:text-sm'

function controlClass(invalid: boolean, extra = '') {
  const tone = invalid
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
    : 'border-slate-300 focus:border-navy-600 focus:ring-navy-600/15'
  return `${control} ${tone} ${extra}`
}

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** Why the browser won't send this control, in the app's language. The
 * browser's own message (in the phone's language) only for the rare rest. */
function problemText(control: FormControl, m: Messages['common']): string {
  const v = control.validity
  const input = control as HTMLInputElement
  if (v.valueMissing) return m.required
  if (v.typeMismatch && input.type === 'email') return m.badEmail
  if (v.tooShort) return m.tooShort(input.minLength)
  // Fields with a pattern explain it in their title.
  if (v.patternMismatch && control.title) return control.title
  if (v.badInput && input.type === 'number') return m.notANumber
  if (v.rangeUnderflow) return m.atLeast(input.min)
  if (v.rangeOverflow) return m.atMost(input.max)
  if (v.stepMismatch && input.step === '1') return m.wholeNumber
  if (v.stepMismatch) return m.decimals(input.step.split('.')[1]?.length ?? 0)
  return control.validationMessage
}

/** Label + control + hint/error. The control inside picks up its id,
 * aria-invalid, and aria-describedby from here, so the label names it and
 * the hint/error is read as its description.
 *
 * A required control gets a * on the label. Submitting the form with it
 * empty (or otherwise invalid) shows the reason under it, in the app's
 * language, instead of the browser's bubble; typing clears it. */
export function Field({
  label,
  hint,
  error,
  className,
  labelClassName = 'mb-1.5 block text-sm font-medium text-slate-700',
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  className?: string
  labelClassName?: string
  children: ReactNode
}) {
  const id = useId()
  const t = useT()
  const [problem, setProblem] = useState<string | null>(null)
  const message = problem ?? error
  const describedBy = message || hint ? `${id}-desc` : undefined

  // React's invalid event bubbles, so this hears the control inside.
  function onInvalid(event: FormEvent<HTMLDivElement>) {
    const control = event.target as FormControl
    event.preventDefault()
    setProblem(problemText(control, t.common))
    // With the bubble off the browser doesn't move to the first bad field,
    // so do it here, clear of the sticky header and the pinned Save bar.
    const first = Array.from(control.form?.elements ?? []).find((el) => !(el as FormControl).validity?.valid)
    if (first === control) {
      control.focus({ preventScroll: true })
      control.scrollIntoView({ block: 'center' })
    }
  }

  return (
    <FieldContext value={{ id, invalid: Boolean(message), describedBy }}>
      <div className={`group/field ${className ?? ''}`} onInvalid={onInvalid} onInput={() => setProblem(null)}>
        <label htmlFor={id} className={labelClassName}>
          {label}
          <span aria-hidden className="ml-0.5 hidden text-red-600 group-has-[:required]/field:inline">
            *
          </span>
        </label>
        {children}
        {message ? (
          <p id={describedBy} className="mt-1.5 flex items-start gap-1 text-sm text-red-600">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {message}
          </p>
        ) : (
          hint && (
            <p id={describedBy} className="mt-1.5 text-xs leading-5 text-slate-500">
              {hint}
            </p>
          )
        )}
      </div>
    </FieldContext>
  )
}

/** Props every control takes from its Field. */
function useFieldProps() {
  const { id, invalid, describedBy } = use(FieldContext)
  return { invalid, field: { id, 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy } }
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Shown inside the field on the left, e.g. a currency symbol. */
  leading?: ReactNode
  /** Shown inside the field on the right, e.g. a show-password button. */
  trailing?: ReactNode
}

export function Input({ leading, trailing, className = '', ...props }: InputProps) {
  const { invalid, field } = useFieldProps()
  const input = (
    <input
      {...field}
      {...props}
      className={controlClass(invalid, `${leading ? 'pl-9' : ''} ${trailing ? 'pr-12' : ''} ${className}`)}
    />
  )
  if (!leading && !trailing) return input
  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-slate-500">
          {leading}
        </span>
      )}
      {input}
      {trailing && <span className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</span>}
    </div>
  )
}

/** Amount in the shop's currency, with its symbol in the field. */
export function MoneyInput({
  currency,
  value,
  onChange,
  ...props
}: {
  currency: Currency
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}) {
  return (
    <Input
      {...props}
      type="number"
      inputMode="decimal"
      min="0"
      step={priceStep(currency)}
      leading={<span className="text-sm font-medium">{currency === 'KHR' ? '៛' : '$'}</span>}
      value={value}
      onWheel={(e) => e.currentTarget.blur()}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  const t = useT()
  const Icon = visible ? EyeOff : Eye
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.common.hidePassword : t.common.showPassword}
          className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          <Icon aria-hidden className="size-5" />
        </button>
      }
    />
  )
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { invalid, field } = useFieldProps()
  return (
    <textarea
      rows={3}
      {...field}
      {...props}
      className={controlClass(invalid, `resize-y ${className}`)}
    />
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const { invalid, field } = useFieldProps()
  return (
    <select
      {...field}
      {...props}
      className={controlClass(invalid, `pr-9 ${className}`)}
    />
  )
}

/** On/off setting as a full-width row: the whole row is the tap target. */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-navy-600/25 after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}

// ---------------------------------------------------------------------------
// Buttons

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant, size)} ${className}`}
    >
      {loading ? (
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
      ) : (
        Icon && <Icon aria-hidden className="size-4" />
      )}
      {children}
    </button>
  )
}

/** Square 44px icon button; `label` is read by screen readers. */
export function IconButton({
  label,
  icon: Icon,
  tone = 'neutral',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone?: 'neutral' | 'danger'
}) {
  const colors = tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-navy-600 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${colors} ${className}`}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Layout pieces

/** Rises into place when it first shows (a page opening, data arriving). */
export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`animate-rise ${cardClass} ${className}`}>
      {children}
    </div>
  )
}

/** The layout's page, fading in when another page opens (not when only the
 * page's params or search change, nor between routes with the same
 * `handle.page`: tabs of one page). `depth`: the page's place in the route
 * tree (1 for the root's children, 2 for a layout's). */
export function PageOutlet({ depth }: { depth: number }) {
  const match = useMatches()[depth]
  const page = (match?.handle as { page?: string } | undefined)?.page ?? match?.id
  return (
    <div key={page} className="animate-fade-in">
      <Outlet />
    </div>
  )
}

/** A titled card section of a form or settings page. `step` numbers it,
 * for a form in parts (checkout). */
export function Section({
  title,
  description,
  action,
  step,
  children,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  step?: number
  children: ReactNode
}) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
            {step !== undefined && (
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-700 tabular-nums"
              >
                {step}
              </span>
            )}
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

/** Page title row. `back` adds a back arrow (a real link, so it works with
 * open-in-new-tab and the browser's back stack stays predictable). */
/** `backOnPhonesOnly`: where a laptop shows the page beside the one the
 * arrow goes back to (an order beside the order list). */
export function PageHeader({
  title,
  back,
  action,
  backOnPhonesOnly = false,
}: {
  title: ReactNode
  back?: string
  action?: ReactNode
  backOnPhonesOnly?: boolean
}) {
  const t = useT()
  return (
    <div className="mb-4 flex items-center gap-2 sm:mb-6">
      {back && (
        <Link
          to={back}
          aria-label={t.common.back}
          className={`-ml-2 ${backOnPhonesOnly ? 'lg:hidden' : ''} inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600`}
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      {action}
    </div>
  )
}

type BadgeTone = 'neutral' | 'red' | 'green' | 'amber' | 'blue'

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const colors = {
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  }[tone]
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${colors}`}>
      {children}
    </span>
  )
}

/** A grey stand-in with a light sweeping across it while loading. */
/** A Badge for a status that can move on while it's on screen: it pops
 * when `value` changes, not when it first shows. */
export function LiveBadge({ value, tone, children }: { value: unknown; tone?: BadgeTone; children: ReactNode }) {
  const bumps = useBump(value)
  return (
    <span key={bumps} className={`inline-flex ${bumps ? 'animate-pop' : ''}`}>
      <Badge tone={tone}>{children}</Badge>
    </span>
  )
}

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={`animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--color-slate-200)_30%,var(--color-slate-100)_50%,var(--color-slate-200)_70%)] bg-size-[200%_100%] ${className}`}
    />
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-600">
        <Icon aria-hidden className="size-6" />
      </span>
      <p className="font-semibold text-slate-900">{title}</p>
      {children && <p className="mt-1 max-w-xs text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}

/** A solid green circle popping in with a white tick that draws itself:
 * it went through. (emerald-500 doesn't flip in dark mode, so the white
 * tick stays readable on it.) */
export function SuccessTick({ className = '', ref }: { className?: string; ref?: Ref<HTMLSpanElement> }) {
  return (
    <span
      ref={ref}
      aria-hidden
      className={`flex size-16 animate-success items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-9">
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} className="animate-tick" />
      </svg>
    </span>
  )
}

/** "All changes saved" in a save bar; with a tick popping in right after a
 * save (key it by the save, so it plays for each one). */
export function SavedNote({ justSaved }: { justSaved: boolean }) {
  const t = useT()
  if (!justSaved) return <>{t.common.allSaved}</>
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 align-bottom text-emerald-700">
      <CircleCheck aria-hidden className="size-4 shrink-0 animate-pop-in" />
      <span className="truncate">{t.common.allSaved}</span>
    </span>
  )
}

/** Message for a failed request, or null. */
export function ErrorMessage({ error }: { error: unknown }) {
  useT() // re-render in the new language
  if (!error) return null
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {errorText(error)}
    </p>
  )
}

/** A failed page load, with a way to try again (flaky mobile data). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT()
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertCircle aria-hidden className="size-6" />
      </span>
      <p className="font-semibold text-slate-900">{t.common.couldNotLoad}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{errorText(error)}</p>
      <Button variant="secondary" icon={RotateCw} className="mt-5" onClick={onRetry}>
        {t.common.tryAgain}
      </Button>
    </Card>
  )
}

/** Full-area loading indicator (used while the session is restored). */
export function Spinner({ label }: { label?: string }) {
  const t = useT()
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-6">
      <div role="status" className="text-slate-400">
        <LoaderCircle aria-hidden className="size-6 animate-spin" />
        <span className="sr-only">{label ?? t.common.loading}</span>
      </div>
      <SlowNotice />
    </div>
  )
}

const SLOW_MS = 4000

/** Shown once something has been loading for a few seconds: the API on
 * Render's free plan sleeps after 15 quiet minutes and takes up to a
 * minute to wake. Render it only while loading. */
export function SlowNotice({ className = '' }: { className?: string }) {
  const t = useT()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(timer)
  }, [])
  if (!slow) return null
  return (
    <p role="status" className={`text-center text-sm text-slate-500 ${className}`}>
      {t.common.slow}
    </p>
  )
}
