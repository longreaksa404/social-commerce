import { AlertCircle, CircleCheck } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n/useT.ts'
import { FeedbackContext, type ConfirmOptions, type ToastTone } from './feedback.ts'
import { buttonClass } from './styles.ts'

type Toast = { id: number; message: string; tone: ToastTone; life: number }
type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void }

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const nextId = useRef(0)
  const t = useT()

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++nextId.current
    const life = tone === 'error' ? 5000 : 3000
    setToasts((list) => [...list.slice(-2), { id, message, tone, life }])
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), life)
  }, [])

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve })
        // Open after React has rendered the dialog's content.
        requestAnimationFrame(() => dialog.current?.showModal())
      }),
    [],
  )

  const close = (ok: boolean) => {
    dialog.current?.close()
    pending?.resolve(ok)
    setPending(null)
  }

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return (
    <FeedbackContext value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            style={{ animationDuration: `${item.life}ms` }}
            className="flex max-w-sm animate-toast items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-slate-50 shadow-lg"
          >
            {item.tone === 'error' ? (
              <AlertCircle aria-hidden className="size-5 shrink-0 text-red-400" />
            ) : (
              <CircleCheck aria-hidden className="size-5 shrink-0 animate-pop-in text-emerald-400 [animation-delay:120ms]" />
            )}
            {item.message}
          </div>
        ))}
      </div>

      {/* Bottom sheet on phones (slides up), centered card from `sm` up.
          Esc / backdrop tap cancel (the dialog's cancel event). */}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault()
          close(false)
        }}
        onClick={(e) => e.target === dialog.current && close(false)}
        aria-labelledby="confirm-title"
        className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-xl open:animate-sheet-up sm:m-auto sm:max-w-sm sm:rounded-2xl sm:open:animate-zoom-in"
      >
        {pending && (
          <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5">
            <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
              {pending.title}
            </h2>
            {pending.message && <p className="mt-2 text-sm leading-6 text-slate-600">{pending.message}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={buttonClass('secondary')} onClick={() => close(false)}>
                {t.common.cancel}
              </button>
              <button
                type="button"
                autoFocus
                className={buttonClass(pending.danger ? 'destructive' : 'primary')}
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? t.common.confirm}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </FeedbackContext>
  )
}
