import { useMutation } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, ErrorMessage, Field, Input, Section } from '../../components/ui.tsx'
import { currentLang } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { apiBlob } from '../../lib/api.ts'
import { formatDate, phnomPenhDate } from '../../lib/orders.ts'

type Range = 'thisMonth' | 'lastMonth' | 'days'
const RANGES: Range[] = ['thisMonth', 'lastMonth', 'days']

/** "2026-10-08" → the first and last day of that month, or of the month
 * before it with `back`. Days as the API counts them (Phnom Penh). */
function month(today: string, back = 0): [string, string] {
  const [year, monthNumber] = today.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1 - back, 1))
  const last = new Date(Date.UTC(year, monthNumber - back, 0))
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)]
}

/** Settings → Export orders: a spreadsheet of the orders placed on some
 * days, for the seller's accounts (one row per order). */
export function ExportPage() {
  const today = phnomPenhDate()
  const [range, setRange] = useState<Range>('thisMonth')
  const [days, setDays] = useState<[string, string]>([month(today)[0], today])
  const t = useT()
  const s = t.settings
  const [first, last] = range === 'thisMonth' ? [month(today)[0], today] : range === 'lastMonth' ? month(today, 1) : days

  const download = useMutation({
    mutationFn: async () => {
      const blob = await apiBlob(`/seller/orders/export?first=${first}&last=${last}&lang=${currentLang()}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orders-${first}-to-${last}.xlsx`
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    download.mutate()
  }

  return (
    <form onSubmit={submit}>
      <Section title={s.exportWhich}>
        <div role="group" aria-label={s.exportWhich} className="flex rounded-xl bg-slate-100 p-0.5">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              onClick={() => setRange(option)}
              className={`min-h-10 flex-1 rounded-[10px] px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
                range === option ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.exportRange[option]}
            </button>
          ))}
        </div>
        {range === 'days' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={s.exportFrom}>
              <Input type="date" required max={today} value={days[0]} onChange={(e) => setDays([e.target.value, days[1]])} />
            </Field>
            <Field label={s.exportTo}>
              <Input type="date" required min={days[0]} max={today} value={days[1]} onChange={(e) => setDays([days[0], e.target.value])} />
            </Field>
          </div>
        )}
        {first && last && <p className="text-sm text-slate-600">{s.exportDays(formatDate(`${first}T00:00`), formatDate(`${last}T00:00`))}</p>}
        <ErrorMessage error={download.error} />
        <Button type="submit" icon={Download} loading={download.isPending} disabled={!first || !last} className="w-full sm:w-auto">
          {s.exportDownload}
        </Button>
      </Section>
    </form>
  )
}
