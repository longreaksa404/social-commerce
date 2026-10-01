import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button, Card, ErrorMessage, Input, Spinner } from '../components/ui.tsx'
import { api } from '../lib/api.ts'
import type { Category } from '../lib/types.ts'
import { keys, useCategories } from './queries.ts'

export function Categories() {
  const categories = useCategories()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: keys.categories })
    queryClient.invalidateQueries({ queryKey: keys.products })
  }
  const create = useMutation({
    mutationFn: (name: string) => api<Category>('/seller/categories', { method: 'POST', body: { name } }),
    onSuccess: () => {
      setName('')
      refresh()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) create.mutate(name.trim())
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Categories</h1>
      <Card>
        <form onSubmit={submit} className="flex gap-2">
          <Input
            placeholder="New category, e.g. Shoes"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Category name"
          />
          <Button type="submit" disabled={create.isPending || !name.trim()} className="shrink-0">
            Add
          </Button>
        </form>
        <div className="mt-2">
          <ErrorMessage error={create.error} />
        </div>
      </Card>

      {categories.isPending && <Spinner />}
      <ErrorMessage error={categories.error} />
      {categories.data?.length === 0 && (
        <p className="text-sm text-slate-500">No categories yet. Categories group products, e.g. "Shoes" or "Bags".</p>
      )}
      {categories.data && categories.data.length > 0 && (
        <Card className="divide-y divide-slate-100 !p-0">
          {categories.data.map((category) => (
            <CategoryRow key={category.id} category={category} onChanged={refresh} />
          ))}
        </Card>
      )}
    </div>
  )
}

function CategoryRow({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)

  const rename = useMutation({
    mutationFn: () => api<Category>(`/seller/categories/${category.id}`, { method: 'PATCH', body: { name: name.trim() } }),
    onSuccess: () => {
      setEditing(false)
      onChanged()
    },
  })
  const remove = useMutation({
    mutationFn: () => api(`/seller/categories/${category.id}`, { method: 'DELETE' }),
    onSuccess: onChanged,
  })

  function confirmDelete() {
    const products = category.product_count
    const note = products ? ` Its ${products} product(s) will stay, without a category.` : ''
    if (window.confirm(`Delete "${category.name}"?${note}`)) remove.mutate()
  }

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-center gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) rename.mutate()
        }}
      >
        <Input autoFocus maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1" />
        <Button type="submit" disabled={rename.isPending || !name.trim()}>
          Save
        </Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <div className="w-full">
          <ErrorMessage error={rename.error} />
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{category.name}</p>
        <p className="text-xs text-slate-500">
          {category.product_count} product{category.product_count === 1 ? '' : 's'} · /{category.slug}
        </p>
        <ErrorMessage error={remove.error} />
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button variant="danger" onClick={confirmDelete} disabled={remove.isPending}>
          Delete
        </Button>
      </div>
    </div>
  )
}
