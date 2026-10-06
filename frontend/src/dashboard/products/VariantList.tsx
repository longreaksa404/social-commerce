import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { buttonClass } from '../../components/styles.ts'
import { IconButton, Input, MoneyInput } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import type { Currency } from '../../lib/types.ts'

export type VariantDraft = { key: string; id?: string; name: string; sku: string; price_override: string; stock_quantity: string }

// One row per option where the list is at least 18rem wide (a 360px phone
// and up): the @min-[18rem] classes. Narrower, each option takes two lines
// with its own labels.
const ROW = '@min-[18rem]:grid-cols-[minmax(0,1fr)_3.5rem_6rem_2.75rem]'

/** Sizes, colours...: a row each (name, stock, price), headings once on
 * top. SKU codes are rarely used, so they show only once asked for, or
 * when an option already has one. */
export function VariantList({
  variants,
  currency,
  productPrice,
  onChange,
  onAdd,
}: {
  variants: VariantDraft[]
  currency: Currency
  productPrice: string
  onChange: (variants: VariantDraft[]) => void
  onAdd: () => void
}) {
  const p = useT().products
  const [skus, setSkus] = useState(() => variants.some((v) => v.sku))
  const set = (key: string, change: Partial<VariantDraft>) =>
    onChange(variants.map((v) => (v.key === key ? { ...v, ...change } : v)))
  // Visible above each field on narrow lists; read by screen readers only
  // where the headings on top say it.
  const label = 'mb-1 block text-xs font-medium text-slate-500 @min-[18rem]:sr-only'

  return (
    <div className="@container space-y-3">
      <div
        aria-hidden
        className={`hidden gap-1.5 text-xs font-medium text-slate-500 @min-[18rem]:grid ${ROW}`}
      >
        <span>{p.variantName}</span>
        <span>{p.stock}</span>
        <span>{p.price}</span>
      </div>
      <ul className={skus ? 'space-y-5' : 'space-y-4 @min-[18rem]:space-y-2'}>
        {variants.map((variant, index) => (
          <li key={variant.key}>
            <div
              role="group"
              aria-label={p.variant(index + 1)}
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-end gap-x-1.5 gap-y-2 ${ROW} @min-[18rem]:items-center`}
            >
              <label className="col-span-2 @min-[18rem]:col-span-1">
                <span className={label}>{p.variantName}</span>
                <Input
                  required
                  placeholder={p.variantNamePlaceholder}
                  maxLength={100}
                  value={variant.name}
                  onChange={(e) => set(variant.key, { name: e.target.value })}
                  className="px-2.5!"
                />
              </label>
              {/* Beside the name on narrow lists; last in the row on wide ones. */}
              <IconButton
                icon={Trash2}
                tone="danger"
                label={p.removeVariant(index + 1)}
                disabled={variants.length === 1}
                onClick={() => onChange(variants.filter((v) => v.key !== variant.key))}
                className="@min-[18rem]:order-last"
              />
              <label>
                <span className={label}>{p.stock}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={variant.stock_quantity}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => set(variant.key, { stock_quantity: e.target.value })}
                  className="px-2.5!"
                />
              </label>
              <label>
                <span className={label}>{p.price}</span>
                <MoneyInput
                  currency={currency}
                  placeholder={productPrice || p.samePrice}
                  value={variant.price_override}
                  onChange={(v) => set(variant.key, { price_override: v })}
                />
              </label>
              {skus && (
                <label className="col-span-3 @min-[18rem]:order-last @min-[18rem]:col-span-4">
                  <span className="mb-1 block text-xs font-medium text-slate-500">{p.sku}</span>
                  <Input
                    maxLength={64}
                    autoCapitalize="characters"
                    value={variant.sku}
                    onChange={(e) => set(variant.key, { sku: e.target.value })}
                  />
                </label>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">{p.variantPriceHint}</p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onAdd} className={`${buttonClass('secondary')} w-full border-dashed`}>
          <Plus aria-hidden className="size-4" />
          {p.addVariant}
        </button>
        {!skus && (
          <button
            type="button"
            onClick={() => setSkus(true)}
            className="-mx-1 self-start rounded px-1 py-2 text-sm font-medium text-navy-700 hover:underline focus-visible:outline-2 focus-visible:outline-navy-600"
          >
            {p.addSkus}
          </button>
        )}
      </div>
    </div>
  )
}
