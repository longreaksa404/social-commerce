import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { Button, ErrorMessage, Input } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import type { Category } from '../../lib/types.ts'
import { keys, useCategories } from '../queries.ts'

const CHIP =
  'flex min-h-11 items-center rounded-xl border border-slate-300 bg-surface px-4 text-sm font-medium text-slate-800 transition-colors'

/** A product's category as chips, one tap to pick, with "+ New" to add one
 * right here (founder's pick 10A, 2026-10-25): the product's other fields
 * stay as typed. The new category is saved at once and picked; the
 * product itself still waits for Save. */
export function CategoryPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const categories = useCategories()
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const t = useT()
  const p = t.products
  const c = t.categories

  const create = useMutation({
    mutationFn: (name: string) => api<Category>('/seller/categories', { method: 'POST', body: { name } }),
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(keys.categories, (list) => [...(list ?? []), category])
      queryClient.invalidateQueries({ queryKey: keys.categories })
      toast(c.added(category.name))
      onChange(category.id)
      setName('')
      setAdding(false)
    },
  })

  function add() {
    if (name.trim()) create.mutate(name.trim())
  }

  // Enter adds the category, not the product (this sits in its form).
  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    } else if (event.key === 'Escape') setAdding(false)
  }

  const options = [{ id: '', name: p.noCategory }, ...(categories.data ?? [])]
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-700">{p.category}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.id || 'none'} className="cursor-pointer">
            <input
              type="radio"
              name="category"
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="peer sr-only"
            />
            <span
              className={`${CHIP} peer-checked:border-navy-700 peer-checked:bg-navy-50 peer-checked:text-navy-800 peer-checked:ring-1 peer-checked:ring-navy-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-600`}
            >
              {option.name}
            </span>
          </label>
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${CHIP} gap-1.5 border-dashed text-navy-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600`}
          >
            <Plus aria-hidden className="size-4" />
            {p.newCategory}
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              autoFocus
              aria-label={c.name}
              placeholder={c.namePlaceholder}
              maxLength={100}
              autoCapitalize="words"
              enterKeyHint="done"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKey}
              className="min-w-0 flex-1"
            />
            <Button loading={create.isPending} disabled={!name.trim()} onClick={add} className="shrink-0">
              {t.common.add}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)} className="shrink-0">
              {t.common.cancel}
            </Button>
          </div>
          <ErrorMessage error={create.error} />
        </div>
      )}
    </fieldset>
  )
}
