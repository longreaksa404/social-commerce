import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Ellipsis, Pencil, Plus, Share2, Tags, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  ErrorState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Skeleton,
} from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { errorText } from '../lib/errors.ts'
import type { Category } from '../lib/types.ts'
import { keys, useCategories } from './queries.ts'

/** /dashboard/categories. Adding one starts from a "New category" button,
 * like New link, so nothing on the page looks like a search box (founder's
 * pick 2A, 2026-10-08); each row keeps its actions in one ⋯ menu (3A). */
export function Categories() {
  const categories = useCategories()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const t = useT()
  const c = t.categories

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: keys.categories })
    queryClient.invalidateQueries({ queryKey: keys.products })
  }
  const newButton = !adding && (
    <Button icon={Plus} onClick={() => setAdding(true)} className="shrink-0">
      {c.newCategory}
    </Button>
  )

  return (
    <>
      <PageHeader title={c.title} back="/dashboard/products" action={newButton} />

      {adding && <AddCategory onClose={() => setAdding(false)} onAdded={refresh} />}

      {categories.isPending ? (
        <Card className="divide-y divide-slate-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </Card>
      ) : categories.error ? (
        <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
      ) : categories.data.length === 0 ? (
        !adding && (
          <EmptyState icon={Tags} title={c.emptyTitle} action={newButton}>
            {c.emptyText}
          </EmptyState>
        )
      ) : (
        <Card className="divide-y divide-slate-100">
          {categories.data.map((category) => (
            <CategoryRow key={category.id} category={category} onChanged={refresh} />
          ))}
        </Card>
      )}
    </>
  )
}

/** The new category's name, with Add and Cancel; closes once added. */
function AddCategory({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { toast } = useFeedback()
  const [name, setName] = useState('')
  const t = useT()
  const c = t.categories
  const create = useMutation({
    mutationFn: (name: string) => api<Category>('/seller/categories', { method: 'POST', body: { name } }),
    onSuccess: (category) => {
      toast(c.added(category.name))
      onAdded()
      onClose()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) create.mutate(name.trim())
  }

  return (
    <Card className="mb-4 animate-rise p-4 sm:p-5">
      <form onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <Field label={c.name}>
          <Input
            autoFocus
            placeholder={c.namePlaceholder}
            maxLength={100}
            autoCapitalize="words"
            enterKeyHint="done"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        {create.error && (
          <div className="mt-3">
            <ErrorMessage error={create.error} />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
            {t.common.add}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function CategoryRow({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const { toast, confirm } = useFeedback()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const t = useT()
  const c = t.categories

  const rename = useMutation({
    mutationFn: () =>
      api<Category>(`/seller/categories/${category.id}`, { method: 'PATCH', body: { name: name.trim() } }),
    onSuccess: () => {
      setEditing(false)
      toast(c.renamed)
      onChanged()
    },
  })
  const remove = useMutation({
    mutationFn: () => api(`/seller/categories/${category.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast(c.deleted(category.name))
      onChanged()
    },
    onError: (err) => toast(errorText(err), 'error'),
  })

  async function confirmDelete() {
    const count = category.product_count
    const ok = await confirm({
      title: c.deleteTitle(category.name),
      message: count ? c.deleteMessage(count) : undefined,
      confirmLabel: t.common.delete,
      danger: true,
    })
    if (ok) remove.mutate()
  }

  if (editing) {
    return (
      <form
        className="p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) rename.mutate()
        }}
      >
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <Input
              autoFocus
              aria-label={c.name}
              maxLength={100}
              enterKeyHint="done"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <IconButton type="submit" icon={Check} label={c.saveName} disabled={rename.isPending || !name.trim()} className="text-navy-700" />
          <IconButton
            icon={X}
            label={t.common.cancel}
            onClick={() => {
              setName(category.name)
              setEditing(false)
            }}
          />
        </div>
        {rename.error && (
          <div className="mt-2">
            <ErrorMessage error={rename.error} />
          </div>
        )}
      </form>
    )
  }

  const count = category.product_count
  return (
    <div className="flex items-center gap-1 py-2 pl-4 pr-2">
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate font-medium text-slate-900">{category.name}</p>
        {count > 0 ? (
          <Link
            to={`/dashboard/products?category=${category.id}`}
            className="text-sm text-navy-700 hover:underline"
          >
            {c.productCount(count)}
          </Link>
        ) : (
          <p className="text-sm text-slate-500">{c.noProducts}</p>
        )}
      </div>
      <RowMenu
        label={c.more(category.name)}
        disabled={remove.isPending}
        items={[
          { label: c.shareLink, icon: Share2, onSelect: () => navigate(`/dashboard/links/new?category=${category.id}`) },
          { label: c.rename, icon: Pencil, onSelect: () => setEditing(true) },
          { label: t.common.delete, icon: Trash2, danger: true, onSelect: confirmDelete },
        ]}
      />
    </div>
  )
}

type MenuItem = { label: string; icon: typeof Pencil; danger?: boolean; onSelect: () => void }

/** A ⋯ button with a small menu under it. Closes on a choice, a tap
 * outside or Escape (which puts focus back on the button); arrow keys move
 * between the items. */
function RowMenu({ label, items, disabled }: { label: string; items: MenuItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      wrap.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const all = [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
      const at = all.indexOf(document.activeElement as HTMLElement)
      all[(at + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]?.focus()
    }
  }

  return (
    <div ref={wrap} className="relative" onKeyDown={onKeyDown}>
      <IconButton
        icon={Ellipsis}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute top-full right-0 z-20 mt-1 flex min-w-48 animate-zoom-in flex-col rounded-xl bg-surface p-1.5 shadow-lg ring-1 ring-slate-900/10"
        >
          {items.map(({ label: text, icon: Icon, danger, onSelect }) => (
            <button
              key={text}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onSelect()
              }}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 sm:min-h-10 ${
                danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Icon aria-hidden className={`size-4.5 ${danger ? '' : 'text-slate-500'}`} />
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
