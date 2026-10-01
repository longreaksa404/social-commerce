import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { ApiError } from '../lib/api.ts'

const control =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm ' +
  'focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 ' +
  'disabled:bg-slate-100 sm:text-sm'

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${control} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ''}`} />
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  }[variant]
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>{children}</div>
}

/** Message for a failed request, or null. */
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{label}</p>
}
