import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAskRemove, useFeedback } from '../../components/feedback.ts'
import { Button, ErrorMessage, Field, Input, MenuButton, MoneyInput, Section, Skeleton } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate, phnomPenhDate } from '../../lib/orders.ts'
import type { Currency, Sale } from '../../lib/types.ts'
import { keys, useProducts, useStore } from '../queries.ts'

const SALES = ['sales'] as const

type Draft = { name: string; kind: 'percent' | 'amount'; value: string; productIds: string[]; endsOn: string }

const blank: Draft = { name: '', kind: 'percent', value: '', productIds: [], endsOn: '' }

const toDraft = (sale: Sale): Draft => ({
  name: sale.name ?? '',
  kind: sale.percent_off !== null ? 'percent' : 'amount',
  value: String(sale.percent_off ?? sale.amount_off ?? ''),
  productIds: sale.product_ids,
  endsOn: sale.ends_on ?? '',
})

/** Settings → Discounts, under the bill discounts (founder's test list
 * #21, 2026-10-24): sales on chosen products, a percentage or an amount
 * off until a last day. Its own list and forms, saved at once with their
 * own Save, apart from the page's. */
export function SalesSection() {
  const s = useT().settings.sales
  const sales = useQuery({ queryKey: SALES, queryFn: () => api<Sale[]>('/seller/sales') })
  // The sale being edited, 'new', or none.
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <Section
      title={s.title}
      action={
        editing === null && (
          <Button variant="secondary" icon={Plus} onClick={() => setEditing('new')} className="shrink-0">
            {s.add}
          </Button>
        )
      }
    >
      {editing === 'new' && <SaleForm onDone={() => setEditing(null)} />}
      {sales.isPending ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : sales.error ? (
        <ErrorMessage error={sales.error} />
      ) : sales.data.length === 0 ? (
        editing !== 'new' && <p className="text-sm text-slate-500">{s.none}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {sales.data.map((sale) =>
            editing === sale.id ? (
              <li key={sale.id} className="p-3">
                <SaleForm sale={sale} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <SaleRow key={sale.id} sale={sale} onEdit={() => setEditing(sale.id)} />
            ),
          )}
        </ul>
      )}
    </Section>
  )
}

function saving(sale: Pick<Sale, 'percent_off' | 'amount_off'>, currency: Currency, s: Messages['settings']['sales']) {
  return sale.percent_off !== null ? s.offPercent(sale.percent_off) : s.offAmount(formatMoney(sale.amount_off ?? 0, currency))
}

function SaleRow({ sale, onEdit }: { sale: Sale; onEdit: () => void }) {
  const t = useT()
  const s = t.settings.sales
  const currency = useStore().data?.currency ?? 'USD'
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const askRemove = useAskRemove()
  const remove = useMutation({
    mutationFn: () => api(`/seller/sales/${sale.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES })
      queryClient.invalidateQueries({ queryKey: keys.products })
      toast(s.removed)
    },
  })
  const day = sale.ends_on && formatDate(`${sale.ends_on}T00:00`)
  return (
    <li className="flex items-center gap-2 py-2 pr-1 pl-3.5">
      <div className={`min-w-0 flex-1 ${sale.active ? '' : 'opacity-60'}`}>
        <p className="truncate font-medium text-slate-900">
          {[sale.name, saving(sale, currency, s)].filter(Boolean).join(' · ')}
        </p>
        <p className="text-sm text-slate-500">
          {s.productCount(sale.product_ids.length)}
          {day && ` · ${sale.active ? s.until(day) : s.ended(day)}`}
        </p>
      </div>
      <MenuButton
        label={s.more}
        disabled={remove.isPending}
        items={[
          { label: s.edit, icon: Pencil, onSelect: onEdit },
          {
            label: t.common.remove,
            icon: Trash2,
            danger: true,
            onSelect: async () => (await askRemove(s.removeAsk)) && remove.mutate(),
          },
        ]}
      />
    </li>
  )
}

function SaleForm({ sale, onDone }: { sale?: Sale; onDone: () => void }) {
  const t = useT()
  const s = t.settings.sales
  const currency = useStore().data?.currency ?? 'USD'
  const products = useProducts()
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [draft, setDraft] = useState<Draft>(() => (sale ? toDraft(sale) : blank))
  const [noProducts, setNoProducts] = useState(false)
  const set = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }))
  // Products on sale now, and any hidden one already in this sale.
  const shown = products.data?.filter((p) => p.status === 'active' || draft.productIds.includes(p.id)) ?? []

  const save = useMutation({
    mutationFn: () =>
      api<Sale>(sale ? `/seller/sales/${sale.id}` : '/seller/sales', {
        method: sale ? 'PUT' : 'POST',
        body: {
          name: draft.name.trim() || null,
          percent_off: draft.kind === 'percent' ? Number(draft.value) : null,
          amount_off: draft.kind === 'amount' ? draft.value : null,
          product_ids: draft.productIds,
          ends_on: draft.endsOn || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES })
      queryClient.invalidateQueries({ queryKey: keys.products })
      toast(s.saved)
      onDone()
    },
  })

  function toggle(id: string) {
    setNoProducts(false)
    set({ productIds: draft.productIds.includes(id) ? draft.productIds.filter((p) => p !== id) : [...draft.productIds, id] })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (draft.productIds.length === 0) return setNoProducts(true)
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-slate-50 p-3">
      <Field label={s.name} error={fieldError(save.error, 'name')}>
        <Input maxLength={40} placeholder="11.11" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div role="group" aria-label={s.kind} className="flex rounded-xl bg-slate-200/60 p-0.5">
        {(['percent', 'amount'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={draft.kind === kind}
            onClick={() => set({ kind, value: '' })}
            className={`min-h-10 flex-1 rounded-[10px] px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
              draft.kind === kind ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {s[kind]}
          </button>
        ))}
      </div>
      <Field label={s.howMuch} error={fieldError(save.error, draft.kind === 'percent' ? 'percent_off' : 'amount_off')}>
        {draft.kind === 'percent' ? (
          <Input
            type="number"
            inputMode="numeric"
            required
            min="1"
            max="90"
            step="1"
            trailing={<span className="text-sm font-medium">%</span>}
            value={draft.value}
            onChange={(e) => set({ value: e.target.value })}
            className="w-32"
          />
        ) : (
          <MoneyInput required currency={currency} value={draft.value} onChange={(value) => set({ value })} />
        )}
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">{s.products}</legend>
        {products.isPending ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl bg-surface ring-1 ring-slate-200">
            {shown.map((product) => (
              <li key={product.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2">
                  <input
                    type="checkbox"
                    checked={draft.productIds.includes(product.id)}
                    onChange={() => toggle(product.id)}
                    className="size-5 shrink-0 accent-navy-700"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{product.name}</span>
                  <span className="shrink-0 text-sm text-slate-500 tabular-nums">{formatMoney(product.price, currency)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {(noProducts || fieldError(save.error, 'product_ids')) && (
          <p role="alert" className="mt-1.5 text-sm text-red-600">
            {fieldError(save.error, 'product_ids') ?? s.chooseProducts}
          </p>
        )}
      </fieldset>
      <Field label={s.lastDay} error={fieldError(save.error, 'ends_on')}>
        <Input type="date" min={phnomPenhDate()} value={draft.endsOn} onChange={(e) => set({ endsOn: e.target.value })} className="w-48" />
      </Field>
      <ErrorMessage error={formError(save.error, ['name', 'percent_off', 'amount_off', 'product_ids', 'ends_on'])} />
      <div className="flex gap-2">
        <Button type="submit" loading={save.isPending} className="flex-1 sm:flex-none">
          {t.common.save}
        </Button>
        <Button variant="secondary" onClick={onDone} className="flex-1 sm:flex-none">
          {t.common.cancel}
        </Button>
      </div>
    </form>
  )
}
