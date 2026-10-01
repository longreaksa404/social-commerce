import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { Button, Card, ErrorMessage, Field, Input, Select, Spinner, TextArea } from '../components/ui.tsx'
import { api } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import type { Currency, Store } from '../lib/types.ts'
import { keys, useStore } from './queries.ts'

export function Settings() {
  const store = useStore()
  if (store.isPending) return <Spinner />
  if (store.error) return <ErrorMessage error={store.error} />
  return <StoreForm store={store.data} />
}

function StoreForm({ store }: { store: Store }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: store.name,
    slug: store.slug,
    description: store.description ?? '',
    currency: store.currency,
  })
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () =>
      api<Store>('/seller/store', {
        method: 'PATCH',
        body: { ...form, description: form.description.trim() || null },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.store, updated)
      setSaved(true)
    },
  })

  const set = (key: keyof typeof form, value: string) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (form.slug !== store.slug && !window.confirm('Changing your shop link breaks links you already shared. Continue?')) {
      return
    }
    save.mutate()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Store settings</h1>
      <form onSubmit={submit}>
        <Card className="space-y-4">
          <Field label="Store name" error={fieldError(save.error, 'name')}>
            <Input required maxLength={100} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field
            label="Shop link"
            error={fieldError(save.error, 'slug')}
            hint={`Customers will open ${window.location.origin}/shop/${form.slug || '…'}`}
          >
            <Input
              required
              minLength={2}
              maxLength={50}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers, and single hyphens"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase())}
            />
          </Field>
          <Field label="Description" error={fieldError(save.error, 'description')}>
            <TextArea maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Currency" hint="Prices are shown in this currency. Existing prices are not converted.">
            <Select value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
              <option value="USD">US dollar ($)</option>
              <option value="KHR">Cambodian riel (៛)</option>
            </Select>
          </Field>
          <ErrorMessage error={formError(save.error, ['name', 'slug', 'description'])} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            {saved && <span className="text-sm text-emerald-700">Saved.</span>}
          </div>
        </Card>
      </form>
      <LogoutButton />
    </div>
  )
}

function LogoutButton() {
  const { logout } = useAuth()
  return (
    <Button variant="secondary" onClick={logout}>
      Log out
    </Button>
  )
}
