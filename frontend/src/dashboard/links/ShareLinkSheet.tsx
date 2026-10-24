import { Copy, Share2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { SourceLogo } from '../../components/SourceLogo.tsx'
import { Button, ErrorMessage, Field, IconButton, Input } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { LINK_SOURCES, linkUrl } from '../../lib/links.ts'
import { hasLogo } from '../../lib/sourceLogos.ts'
import type { LinkTarget } from '../../lib/types.ts'
import { useCreateLink, useLinks } from '../queries.ts'

const OTHER = 'other'

export type ShareTarget = { type: Exclude<LinkTarget, 'store'>; id: string; name: string }

/** The phone's share list, or copied on a laptop. False when the browser
 * refused (the tap was too long ago, e.g. after making the link): the
 * sheet then shows Share and Copy to tap. */
async function shareOrCopy(title: string, url: string, copied: () => void): Promise<boolean> {
  const phone = window.matchMedia('(pointer: coarse)').matches
  if (phone && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url })
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return true
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    copied()
    return true
  } catch {
    return false
  }
}

/** Share on a product or a category (founder's test list #9, 2026-10-24:
 * it used to open New link on the Links tab). Pick where it'll be posted:
 * the link for that place (made now, or the one made before) goes to the
 * share list, so its views and orders still count, and the seller stays
 * on the page. A bottom sheet on phones, a centred card from `sm` up. */
export function ShareLinkSheet({ target, open, onClose }: { target: ShareTarget; open: boolean; onClose: () => void }) {
  const t = useT()
  const l = t.links
  const { toast } = useFeedback()
  const links = useLinks()
  const create = useCreateLink()
  const resetCreate = create.reset
  const dialog = useRef<HTMLDialogElement>(null)
  const [other, setOther] = useState<string | null>(null)
  // A link the browser wouldn't share by itself: tap Share or Copy.
  const [ready, setReady] = useState<string | null>(null)

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      setOther(null)
      setReady(null)
      resetCreate()
      el.showModal()
    } else if (!open && el.open) el.close()
  }, [open, resetCreate])

  const copied = () => toast(l.linkCopied)

  async function send(url: string) {
    if (await shareOrCopy(target.name, url, copied)) onClose()
    else setReady(url)
  }

  async function pick(source: string) {
    const made = links.data?.find(
      (link) =>
        link.target_type === target.type &&
        link.target_id === target.id &&
        link.source === source &&
        !link.campaign &&
        link.path,
    )
    if (made?.path) return send(linkUrl(made.path))
    try {
      const link = await create.mutateAsync({ target_type: target.type, target_id: target.id, source, campaign: null })
      if (link.path) await send(linkUrl(link.path))
    } catch {
      // Shown under the places.
    }
  }

  function submitOther(event: FormEvent) {
    event.preventDefault()
    if (other?.trim()) pick(other.trim())
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby="share-link-title"
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-xl open:animate-sheet-up sm:m-auto sm:max-w-md sm:rounded-2xl sm:open:animate-zoom-in"
    >
      {open && (
        <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="share-link-title" className="min-w-0 text-lg font-semibold break-words text-slate-900">
              {l.shareTitle(target.name)}
            </h2>
            <IconButton icon={X} label={t.common.close} onClick={onClose} className="-mr-2" />
          </div>

          {ready ? (
            <div className="mt-4 space-y-3">
              <p className="truncate rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">{ready}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button icon={Share2} onClick={() => send(ready)}>
                  {t.common.share}
                </Button>
                <Button
                  variant="secondary"
                  icon={Copy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(ready)
                      copied()
                      onClose()
                    } catch {
                      toast(l.copyFailed, 'error')
                    }
                  }}
                >
                  {l.copy}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">{l.wherePost}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...LINK_SOURCES, { key: OTHER, label: l.other }].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={create.isPending || links.isPending}
                    aria-pressed={s.key === OTHER ? other !== null : undefined}
                    aria-busy={create.isPending && create.variables?.source === s.key ? true : undefined}
                    onClick={() => (s.key === OTHER ? setOther('') : pick(s.key))}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-surface text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600 disabled:opacity-50 aria-pressed:border-navy-600 aria-pressed:bg-navy-50 aria-pressed:text-navy-800 ${
                      hasLogo(s.key) ? 'pr-4 pl-2' : 'px-4'
                    }`}
                  >
                    <SourceLogo source={s.key} className="size-6" />
                    {s.label}
                  </button>
                ))}
              </div>
              {other !== null && (
                <form onSubmit={submitOther} className="mt-4 flex items-end gap-2">
                  <Field label={l.where} className="min-w-0 flex-1">
                    <Input
                      autoFocus
                      required
                      maxLength={30}
                      placeholder={l.wherePlaceholder}
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" icon={Share2} loading={create.isPending} disabled={!other.trim()}>
                    {t.common.share}
                  </Button>
                </form>
              )}
              <ErrorMessage error={create.error} />
            </>
          )}
        </div>
      )}
    </dialog>
  )
}
