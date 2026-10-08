import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { SourceLogo } from '../../components/SourceLogo.tsx'
import { hasLogo } from '../../lib/sourceLogos.ts'
import { Button, Card, ErrorMessage, Field, Input, PageHeader, Select, Skeleton } from '../../components/ui.tsx'
import { fieldError, formError } from '../../lib/errors.ts'
import { useT } from '../../i18n/useT.ts'
import { LINK_SOURCES } from '../../lib/links.ts'
import type { LinkTarget } from '../../lib/types.ts'
import { useCategories, useCreateLink, useProducts } from '../queries.ts'

const OTHER = 'other'

/** "store", "product:<id>" or "category:<id>": the select's value. */
function parseTarget(value: string): { target_type: LinkTarget; target_id: string | null } {
  const [type, id] = value.split(':')
  return { target_type: type as LinkTarget, target_id: id ?? null }
}

/** /dashboard/links/new: pick the page and the place it'll be posted.
 * ?product=<id> or ?category=<id> (from a Share button) picks the page. */
export function NewLink() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const products = useProducts()
  const categories = useCategories()
  const create = useCreateLink()
  const t = useT()
  const l = t.links

  const [target, setTarget] = useState(() => {
    const product = params.get('product')
    const category = params.get('category')
    return product ? `product:${product}` : category ? `category:${category}` : 'store'
  })
  const [source, setSource] = useState('')
  const [otherSource, setOtherSource] = useState('')
  const [campaign, setCampaign] = useState('')

  const place = source === OTHER ? otherSource.trim() : source
  // Until the lists arrive, a product picked by a Share button has no
  // option yet and the select would show "Whole shop".
  const loading = products.isPending || categories.isPending
  const shown = products.data?.filter((p) => p.status === 'active' || target === `product:${p.id}`) ?? []

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!place) return
    create.mutate(
      { ...parseTarget(target), source: place, campaign: campaign.trim() || null },
      {
        onSuccess: (link) => {
          toast(l.ready)
          navigate(`/dashboard/links/${link.id}`, { replace: true })
        },
      },
    )
  }

  return (
    <>
      <PageHeader title={l.newLink} back="/dashboard/links" />
      <title>{l.newLink}</title>

      <form onSubmit={submit} className="space-y-4">
        <Card className="space-y-5 p-4 sm:p-6">
          <Field label={l.whatItOpens} error={fieldError(create.error, 'target_id')}>
            {loading ? (
              <Skeleton className="h-11 w-full rounded-xl" />
            ) : (
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="store">{l.wholeShop}</option>
                {shown.length > 0 && (
                  <optgroup label={l.products}>
                    {shown.map((p) => (
                      <option key={p.id} value={`product:${p.id}`}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categories.data && categories.data.length > 0 && (
                  <optgroup label={l.categories}>
                    {categories.data.map((c) => (
                      <option key={c.id} value={`category:${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
            )}
          </Field>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-slate-700">{l.wherePost}</legend>
            <div className="flex flex-wrap gap-2">
              {[...LINK_SOURCES, { key: OTHER, label: l.other }].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={source === s.key}
                  onClick={() => setSource(s.key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-navy-600 ${
                    hasLogo(s.key) ? 'pr-4 pl-2' : 'px-4'
                  } ${
                    source === s.key
                      ? 'border-navy-600 bg-navy-50 text-navy-800'
                      : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <SourceLogo source={s.key} className="size-6" />
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          {source === OTHER && (
            <Field label={l.where} error={fieldError(create.error, 'source')}>
              <Input
                autoFocus
                required
                maxLength={30}
                placeholder={l.wherePlaceholder}
                value={otherSource}
                onChange={(e) => setOtherSource(e.target.value)}
              />
            </Field>
          )}

          <Field
            label={l.name}
            hint={l.nameHint}
            error={fieldError(create.error, 'campaign')}
          >
            <Input maxLength={60} value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </Field>
        </Card>

        <ErrorMessage error={formError(create.error, ['target_id', 'source', 'campaign'])} />
        <Button type="submit" size="lg" loading={create.isPending} disabled={!place || loading} className="w-full sm:w-auto">
          {l.make}
        </Button>
      </form>
    </>
  )
}
