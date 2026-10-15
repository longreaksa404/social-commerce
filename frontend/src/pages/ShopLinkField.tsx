import { Field, Input } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { fieldError } from '../lib/errors.ts'

/** Shown under the store name so a name in Khmer gets a readable link,
 * not a random one. Left empty, the API picks one. */
export function ShopLinkField({
  slug,
  onChange,
  error,
}: {
  slug: string
  onChange: (slug: string) => void
  error: unknown
}) {
  const t = useT()
  const r = t.auth.register
  return (
    <Field label={r.shopLink} error={fieldError(error, 'slug')} hint={r.shopLinkHint}>
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
          placeholder="sokha-fashion"
          value={slug}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
        />
        <p className="mt-1.5 break-all font-mono text-xs text-slate-500">
          {window.location.host}/shop/<span className="font-semibold text-slate-700">{slug || '…'}</span>
        </p>
      </div>
    </Field>
  )
}
