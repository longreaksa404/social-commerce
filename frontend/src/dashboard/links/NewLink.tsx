import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Card, ErrorMessage, Field, Input, PageHeader, Select, Skeleton } from '../../components/ui.tsx'
import { fieldError, formError } from '../../lib/errors.ts'
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
          toast('Link ready. Copy it or share it.')
          navigate(`/dashboard/links/${link.id}`, { replace: true })
        },
      },
    )
  }

  return (
    <>
      <PageHeader title="New link" back="/dashboard/links" />
      <title>New link</title>

      <form onSubmit={submit} className="space-y-4">
        <Card className="space-y-5 p-4 sm:p-6">
          <Field label="What it opens" error={fieldError(create.error, 'target_id')}>
            {loading ? (
              <Skeleton className="h-11 w-full rounded-xl" />
            ) : (
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="store">Whole shop</option>
                {shown.length > 0 && (
                  <optgroup label="Products">
                    {shown.map((p) => (
                      <option key={p.id} value={`product:${p.id}`}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categories.data && categories.data.length > 0 && (
                  <optgroup label="Categories">
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
            <legend className="mb-1.5 block text-sm font-medium text-slate-700">Where you'll post it</legend>
            <div className="flex flex-wrap gap-2">
              {[...LINK_SOURCES, { key: OTHER, label: 'Other' }].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={source === s.key}
                  onClick={() => setSource(s.key)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                    source === s.key
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          {source === OTHER && (
            <Field label="Where?" error={fieldError(create.error, 'source')}>
              <Input
                autoFocus
                required
                maxLength={30}
                placeholder="e.g. YouTube, my Facebook group"
                value={otherSource}
                onChange={(e) => setOtherSource(e.target.value)}
              />
            </Field>
          )}

          <Field
            label="Name (optional)"
            hint="To tell your links apart, like “Video 3 Oct” or “September sale”."
            error={fieldError(create.error, 'campaign')}
          >
            <Input maxLength={60} value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </Field>
        </Card>

        <ErrorMessage error={formError(create.error, ['target_id', 'source', 'campaign'])} />
        <Button type="submit" size="lg" loading={create.isPending} disabled={!place || loading} className="w-full sm:w-auto">
          Make link
        </Button>
      </form>
    </>
  )
}
