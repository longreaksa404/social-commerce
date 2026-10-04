import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ComponentType, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Card, ErrorMessage, ErrorState, PageHeader, SavedNote, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { formError } from '../../lib/errors.ts'
import type { Store } from '../../lib/types.ts'
import { keys, useStore } from '../queries.ts'
import { useUnsavedChanges } from '../useUnsavedChanges.ts'
import {
  DeliveryFields,
  DiscountsFields,
  LinkFields,
  OrdersFields,
  PaymentsFields,
  ShopFields,
  TelegramFields,
  type FieldsProps,
} from './fields.tsx'
import { isSectionId, SECTIONS, toForm, type SectionId } from './form.ts'

const FIELDS: Record<SectionId, ComponentType<FieldsProps>> = {
  shop: ShopFields,
  orders: OrdersFields,
  payments: PaymentsFields,
  delivery: DeliveryFields,
  discounts: DiscountsFields,
  telegram: TelegramFields,
  link: LinkFields,
}

/** /dashboard/settings/:section: one part of the shop's settings, opened
 * from the Settings menu, with its own Save. */
export function SettingsSection() {
  const { section } = useParams()
  const store = useStore()
  const t = useT()
  if (!isSectionId(section)) return <Navigate to="/dashboard/settings" replace />
  const { title, hint } = SECTIONS[section]

  return (
    <>
      <title>{title(t.settings)}</title>
      <PageHeader title={title(t.settings)} back="/dashboard/settings" />
      {hint && <p className="-mt-2 mb-4 text-sm leading-6 text-slate-500 sm:-mt-4">{hint(t.settings)}</p>}
      {store.isPending ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : store.error ? (
        <ErrorState error={store.error} onRetry={() => store.refetch()} />
      ) : (
        <SectionForm key={section} id={section} store={store.data} />
      )}
    </>
  )
}

function SectionForm({ id, store }: { id: SectionId; store: Store }) {
  const section = SECTIONS[id]
  const Fields = FIELDS[id]
  const queryClient = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [form, setForm] = useState(() => toForm(store))
  const t = useT()
  const s = t.settings
  const body = section.body(form)
  const dirty = JSON.stringify(body) !== JSON.stringify(section.body(toForm(store)))
  useUnsavedChanges(dirty)

  const save = useMutation({
    mutationFn: () => api<Store>('/seller/store', { method: 'PATCH', body }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.store, updated)
      setForm(toForm(updated))
      toast(s.saved)
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (id === 'link' && form.slug !== store.slug) {
      const ok = await confirm({
        title: s.changeLinkTitle,
        message: s.changeLinkMessage,
        confirmLabel: s.changeLink,
      })
      if (!ok) return
    }
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-4 p-4 sm:p-6">
        <Fields
          store={store}
          form={form}
          update={(changes) => setForm((f) => ({ ...f, ...changes }))}
          error={save.error}
        />
      </Card>
      <ErrorMessage error={formError(save.error, section.fields(form))} />

      {/* Pinned to the bottom so Save is always in reach (floating at the
          bottom of the column on wide screens). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:sticky lg:bottom-4 lg:mt-4 lg:rounded-2xl lg:border-0 lg:bg-surface/95 lg:pb-0 lg:shadow-card lg:ring-1 lg:ring-slate-900/6">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-500" aria-live="polite">
            {dirty ? t.common.unsaved : <SavedNote key={save.submittedAt} justSaved={save.isSuccess} />}
          </span>
          <Button type="submit" loading={save.isPending} disabled={!dirty} className="min-w-32">
            {t.common.save}
          </Button>
        </div>
      </div>
    </form>
  )
}
