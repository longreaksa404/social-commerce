import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Share2, Tags, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  ErrorState,
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

export function Categories() {
  const categories = useCategories()
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [name, setName] = useState('')
  const t = useT()
  const c = t.categories

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: keys.categories })
    queryClient.invalidateQueries({ queryKey: keys.products })
  }
  const create = useMutation({
    mutationFn: (name: string) => api<Category>('/seller/categories', { method: 'POST', body: { name } }),
    onSuccess: (category) => {
      setName('')
      toast(c.added(category.name))
      refresh()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) create.mutate(name.trim())
  }

  return (
    <>
      <PageHeader title={c.title} back="/dashboard/products" />

      <Card className="mb-4 p-4">
        <form onSubmit={submit} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              aria-label={c.newName}
              placeholder={c.namePlaceholder}
              maxLength={100}
              autoCapitalize="words"
              enterKeyHint="done"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" icon={Plus} loading={create.isPending} disabled={!name.trim()}>
            {t.common.add}
          </Button>
        </form>
        {create.error && (
          <div className="mt-3">
            <ErrorMessage error={create.error} />
          </div>
        )}
      </Card>

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
        <EmptyState icon={Tags} title={c.emptyTitle}>
          {c.emptyText}
        </EmptyState>
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
      <IconButton
        icon={Share2}
        label={c.share(category.name)}
        onClick={() => navigate(`/dashboard/links/new?category=${category.id}`)}
      />
      <IconButton icon={Pencil} label={c.rename(category.name)} onClick={() => setEditing(true)} />
      <IconButton
        icon={Trash2}
        tone="danger"
        label={c.delete(category.name)}
        disabled={remove.isPending}
        onClick={confirmDelete}
      />
    </div>
  )
}
