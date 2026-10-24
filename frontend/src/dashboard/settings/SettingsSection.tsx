import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ComponentType, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Card, ErrorMessage, ErrorState, PageHeader, SavedNote, Skeleton } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { formError } from '../../lib/errors.ts'
import { convertMoney, formatMoney } from '../../lib/money.ts'
import type { Product, Store } from '../../lib/types.ts'
import { keys, useRole, useStore } from '../queries.ts'
import { useUnsavedChanges } from '../useUnsavedChanges.ts'
import {
  DeliveryFields,
  ContactFields,
  DiscountsFields,
  OrdersFields,
  PaymentsFields,
  ShopFields,
  type FieldsProps,
} from './fields.tsx'
import { AccountPage } from './AccountPage.tsx'
import { CloseShopPage, CloseShopRow } from './CloseShopPage.tsx'
import { StaffPage } from './StaffPage.tsx'
import { ExportOrders } from './ExportOrders.tsx'
import { SalesSection } from './SalesSection.tsx'
import { PlanPage } from './PlanPage.tsx'
import { SetupPage } from './SetupPage.tsx'
import { isPageId, isSectionId, MOVED, SECTIONS, toForm, type PageId, type SectionId } from './form.ts'

const FIELDS: Record<SectionId, ComponentType<FieldsProps>> = {
  shop: ShopFields,
  orders: OrdersFields,
  payments: PaymentsFields,
  delivery: DeliveryFields,
  discounts: DiscountsFields,
  contact: ContactFields,
}

/** What a page shows under its form, with its own buttons. */
const AFTER: Partial<Record<SectionId, ComponentType>> = {
  shop: CloseShopRow,
  // Sales on chosen products (test list #21, 2026-10-24).
  discounts: SalesSection,
}

/** Pages with their own form and endpoint, not the store's PATCH. `back`:
 * where the back arrow goes, if not the menu. */
const PAGES: Record<
  PageId,
  { title: (s: Messages['settings']) => string; hint?: (s: Messages['settings']) => string; Page: ComponentType; back?: string }
> = {
  account: { title: (s) => s.yourAccount, Page: AccountPage },
  plan: { title: (s) => s.plan.title, Page: PlanPage },
  close: { title: (s) => s.closeShop, Page: CloseShopPage, back: '/dashboard/settings/shop' },
  staff: { title: (s) => s.staff, Page: StaffPage },
  setup: { title: (s) => s.setup.title, Page: SetupPage },
  export: { title: (s) => s.exportOrders, Page: ExportOrders },
}

/** /dashboard/settings/:section: one part of the shop's settings, opened
 * from the Settings menu, with its own Save. On laptops it shows beside
 * the menu (SettingsPage), which passes `open`. */
export function SettingsSection({ open }: { open?: string }) {
  const params = useParams()
  const section = open ?? params.section
  const store = useStore()
  const role = useRole()
  const t = useT()
  // Staff have their own account here and nothing else (the API refuses
  // them the rest anyway).
  if (role === 'staff' && section !== 'account') return <Navigate to="/dashboard/settings/account" replace />
  if (section && Object.hasOwn(MOVED, section)) return <Navigate to={MOVED[section]} replace />
  if (isPageId(section)) return <OwnPage id={section} />
  if (!isSectionId(section)) return <Navigate to="/dashboard/settings" replace />
  const { title, hint } = SECTIONS[section]
  const After = AFTER[section]

  return (
    <>
      <title>{title(t.settings)}</title>
      <PageHeader title={title(t.settings)} back="/dashboard/settings" backOnPhonesOnly />
      {hint && <p className="-mt-2 mb-4 text-sm leading-6 text-slate-500 sm:-mt-4">{hint(t.settings)}</p>}
      {store.isPending ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : store.error ? (
        <ErrorState error={store.error} onRetry={() => store.refetch()} />
      ) : (
        <>
          <SectionForm key={section} id={section} store={store.data} />
          {After && (
            <div className="mt-4">
              <After />
            </div>
          )}
        </>
      )}
    </>
  )
}

function OwnPage({ id }: { id: PageId }) {
  const t = useT()
  const { title, hint, Page, back = '/dashboard/settings' } = PAGES[id]
  return (
    <>
      <title>{title(t.settings)}</title>
      <PageHeader title={title(t.settings)} back={back} backOnPhonesOnly={back === '/dashboard/settings'} />
      {hint && <p className="-mt-2 mb-4 text-sm leading-6 text-slate-500 sm:-mt-4">{hint(t.settings)}</p>}
      <Page />
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
  const switching = id === 'shop' && form.currency !== store.currency

  const save = useMutation({
    mutationFn: () => api<Store>('/seller/store', { method: 'PATCH', body }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.store, updated)
      setForm(toForm(updated))
      toast(s.saved)
      // A new currency converted every product's price.
      if (updated.currency !== store.currency) queryClient.invalidateQueries({ queryKey: keys.products })
    },
  })

  /** A new currency converts every price, fee and discount at Oak
   * Order's rate (founder's test list #15, 2026-10-24; until then they
   * kept their numbers), so ask first, with one of the shop's own
   * products as the example (settings check #1, 2026-10-19). */
  async function confirmSwitch(): Promise<boolean> {
    const to = form.currency
    const rate = formatMoney(store.khr_per_usd, 'KHR')
    const product = queryClient.getQueryData<Product[]>(keys.products)?.find((p) => Number(p.price) > 0)
    const example = product
      ? s.switchExample(
          product.name,
          formatMoney(product.price, store.currency),
          formatMoney(convertMoney(product.price, to, store.khr_per_usd), to),
        )
      : ''
    return confirm({
      title: s.switchTitle[to],
      message: s.switchMessage(rate, example),
      confirmLabel: s.switchButton[to],
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (switching && !(await confirmSwitch())) return
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
