import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Share2, Tags, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  ErrorState,
  Field,
  Input,
  IconButton,
  MenuButton,
  PageHeader,
  Skeleton,
} from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { errorText } from '../lib/errors.ts'
import type { Category } from '../lib/types.ts'
import { keys, useCategories } from './queries.ts'
import { ShareLinkSheet } from './links/ShareLinkSheet.tsx'

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

/** The new category's name in a small window (founder's pick 3B,
 * 2026-11-07); closes once added. */
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
    <CategoryDialog title={c.newCategory} onClose={onClose}>
      <form onSubmit={submit}>
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
    </CategoryDialog>
  )
}

function CategoryRow({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const t = useT()
  const c = t.categories

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

  const count = category.product_count
  return (
    <div className="flex items-center gap-1 py-2 pl-4 pr-2">
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate font-medium text-slate-900">{category.name}</p>
        {count > 0 ? (
          <Link
            to={`/dashboard/products?category=${category.id}`}
            className="text-sm text-navy-700 link"
          >
            {c.productCount(count)}
          </Link>
        ) : (
          <p className="text-sm text-slate-500">{c.noProducts}</p>
        )}
      </div>
      <MenuButton
        label={c.more(category.name)}
        disabled={remove.isPending}
        items={[
          { label: c.shareLink, icon: Share2, onSelect: () => setSharing(true) },
          { label: c.rename, icon: Pencil, onSelect: () => setEditing(true) },
          { label: t.common.delete, icon: Trash2, danger: true, onSelect: confirmDelete },
        ]}
      />
      <ShareLinkSheet
        target={{ type: 'category', id: category.id, name: category.name }}
        open={sharing}
        onClose={() => setSharing(false)}
      />
      {editing && (
        <RenameCategory
          category={category}
          onClose={() => setEditing(false)}
          onRenamed={() => {
            toast(c.renamed)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function RenameCategory({
  category,
  onClose,
  onRenamed,
}: {
  category: Category
  onClose: () => void
  onRenamed: () => void
}) {
  const [name, setName] = useState(category.name)
  const t = useT()
  const c = t.categories
  const rename = useMutation({
    mutationFn: () =>
      api<Category>(`/seller/categories/${category.id}`, { method: 'PATCH', body: { name: name.trim() } }),
    onSuccess: () => {
      onRenamed()
      onClose()
    },
  })

  return (
    <CategoryDialog title={c.rename} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim()) rename.mutate()
        }}
      >
        <Field label={c.name}>
          <Input
            autoFocus
            maxLength={100}
            autoCapitalize="words"
            enterKeyHint="done"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {rename.error && (
          <div className="mt-3">
            <ErrorMessage error={rename.error} />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={rename.isPending} disabled={!name.trim() || name.trim() === category.name}>
            {c.saveName}
          </Button>
        </div>
      </form>
    </CategoryDialog>
  )
}

/** Shared add/rename window: a bottom sheet on phones and a centred small
 * dialog from 640px up. */
function CategoryDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const t = useT()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    element.showModal()
    return () => element.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="category-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-xl open:animate-sheet-up sm:m-auto sm:max-w-sm sm:rounded-2xl sm:open:animate-zoom-in"
    >
      <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="category-dialog-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <IconButton icon={X} label={t.common.close} onClick={onClose} className="-mr-2" />
        </div>
        {children}
      </div>
    </dialog>
  )
}
