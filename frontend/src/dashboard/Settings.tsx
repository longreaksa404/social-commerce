import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import {
  Button,
  ErrorMessage,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Section,
  Select,
  Skeleton,
  TextArea,
} from '../components/ui.tsx'
import { api } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import type { Currency, Store } from '../lib/types.ts'
import { keys, useStore } from './queries.ts'
import { useUnsavedChanges } from './useUnsavedChanges.ts'

export function Settings() {
  const store = useStore()
  return (
    <>
      <PageHeader title="Settings" />
      {store.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : store.error ? (
        <ErrorState error={store.error} onRetry={() => store.refetch()} />
      ) : (
        <StoreForm store={store.data} />
      )}
      <AccountSection />
    </>
  )
}

type Form = { name: string; slug: string; description: string; currency: Currency }

const toForm = (store: Store): Form => ({
  name: store.name,
  slug: store.slug,
  description: store.description ?? '',
  currency: store.currency,
})

function StoreForm({ store }: { store: Store }) {
  const queryClient = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [form, setForm] = useState(() => toForm(store))
  const baseline = toForm(store)
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  useUnsavedChanges(dirty)

  const save = useMutation({
    mutationFn: () =>
      api<Store>('/seller/store', {
        method: 'PATCH',
        body: { ...form, name: form.name.trim(), description: form.description.trim() || null },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.store, updated)
      setForm(toForm(updated))
      toast('Settings saved')
    },
  })

  const set = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (form.slug !== store.slug) {
      const ok = await confirm({
        title: 'Change your shop link?',
        message: 'Links you already shared on social media will stop working.',
        confirmLabel: 'Change link',
      })
      if (!ok) return
    }
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-4">
      <Section title="Store">
        <Field label="Store name" error={fieldError(save.error, 'name')}>
          <Input
            required
            maxLength={100}
            autoCapitalize="words"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field
          label="Description"
          error={fieldError(save.error, 'description')}
          hint="Optional. A line about what you sell, shown on your shop page."
        >
          <TextArea
            maxLength={2000}
            autoCapitalize="sentences"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field label="Currency" hint="Prices are shown in this currency. Existing prices are not converted.">
          <Select value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
            <option value="USD">US dollar ($)</option>
            <option value="KHR">Cambodian riel (៛)</option>
          </Select>
        </Field>
      </Section>

      <Section title="Shop link" description="The address you share with customers.">
        <Field label="Link name" error={fieldError(save.error, 'slug')}>
          <Input
            required
            minLength={2}
            maxLength={50}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and single hyphens"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase())}
          />
        </Field>
        <p className="break-all rounded-xl bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-700">
          {window.location.host}/shop/<span className="font-semibold text-slate-900">{form.slug || '…'}</span>
        </p>
        {/* The saved link: an unsaved new slug doesn't work yet. */}
        <Link
          to={`/shop/${store.slug}`}
          target="_blank"
          className={`${buttonClass('secondary')} w-full sm:w-auto`}
        >
          <ExternalLink aria-hidden className="size-4" />
          Open shop
        </Link>
      </Section>

      <ErrorMessage error={formError(save.error, ['name', 'slug', 'description'])} />
      <Button type="submit" size="lg" loading={save.isPending} disabled={!dirty} className="w-full sm:w-auto">
        Save settings
      </Button>
    </form>
  )
}

function AccountSection() {
  const { logout } = useAuth()
  return (
    <Section title="Account">
      <Button variant="secondary" icon={LogOut} onClick={logout} className="w-full sm:w-auto">
        Log out
      </Button>
    </Section>
  )
}
