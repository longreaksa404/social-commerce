import { Field, Input } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { fieldError } from '../lib/errors.ts'

/** Shown under the store name so a name in Khmer gets a readable link,
 * not a random one. Left empty, the API picks one, so while it's empty
 * after a shop name with no English letters, amber words ask for it
 * (founder's pick 4A, 2026-10-18). */
export function ShopLinkField({
  slug,
  storeName,
  onChange,
  error,
}: {
  slug: string
  storeName: string
  onChange: (slug: string) => void
  error: unknown
}) {
  const t = useT()
  const r = t.auth.register
  const ask = slug === '' && storeName.trim() !== ''
  return (
    <Field label={r.shopLink} error={fieldError(error, 'slug')} hint={ask ? undefined : r.shopLinkHint}>
      <div>
        <Input
          minLength={2}
          maxLength={50}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title={t.settings.linkNameTitle}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder={t.common.example('sokha-fashion')}
          value={slug}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
        />
        {ask ? (
          <p className="mt-1.5 text-xs leading-5 font-medium text-amber-700" aria-live="polite">
            {r.shopLinkAsk}
          </p>
        ) : (
          <p className="mt-1.5 text-xs leading-5 break-all text-slate-500">
            {window.location.host}/shop/<span className="font-semibold text-slate-700">{slug || '…'}</span>
          </p>
        )}
      </div>
    </Field>
  )
}
