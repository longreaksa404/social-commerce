import { useMemo, type ReactNode } from 'react'
import { encode } from 'uqr'
import { formatAmount } from '../lib/money.ts'
import type { Currency } from '../lib/types.ts'

/** A KHQR on screen, laid out like the founder's ABA PayWay picture
 * (2026-11-03): the red band with KHQR in the middle and its corner tab,
 * who is paid and "2.50 USD" starting where the code starts, a dashed
 * line, then the code with the currency's mark in its middle. Used by the
 * pay popup, the order page and Settings → Plan; the saved picture
 * (lib/khqrImage.ts) is drawn the same way.
 *
 * It keeps its own colours in dark mode: bank apps scan black on white.
 * `column`: the width the words and the code share (the popup's code is
 * sized to the screen, a card's to the card). `band`: extras in the red
 * band, such as the popup's grab bar and ✕. */
export function KhqrCard({
  code,
  name,
  amount,
  currency,
  label,
  column = 'w-[84%]',
  bandClassName = 'h-12',
  band,
  className = '',
}: {
  code: string
  name: string
  amount: string | number
  currency: Currency
  label: string
  column?: string
  bandClassName?: string
  band?: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white text-[#0f172a] ${className}`}>
      <div className={`relative flex items-center justify-center bg-[#E1232E] text-white ${bandClassName}`}>
        <span aria-hidden className="text-xl font-extrabold tracking-wide">
          KHQR
        </span>
        {band}
        {/* The band's corner tab, under its right end. */}
        <span
          aria-hidden
          className="absolute top-full right-0 size-0 border-t-[14px] border-l-[28px] border-t-[#E1232E] border-l-transparent"
        />
      </div>
      <div className={`mx-auto pt-4 pb-3 ${column}`}>
        <p className="truncate text-xs font-semibold tracking-wide text-[#334155]">{name}</p>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[1.75rem] leading-tight font-extrabold tabular-nums">{formatAmount(amount, currency)}</span>
          <span className="text-sm font-semibold text-[#64748b]">{currency}</span>
        </p>
      </div>
      <div aria-hidden className="border-t-[1.5px] border-dashed border-[#cbd5e1]" />
      {/* Padding, not margin: white all round the code, as scanners want
          (about four modules). A margin here slipped out of the card and
          left the code touching the dark sheet below in dark mode. */}
      <div className={`mx-auto py-6 ${column}`}>
        <QrCode code={code} currency={currency} label={label} />
      </div>
    </div>
  )
}

/** The code as SVG, sharp at any size: black on white, each row's dark
 * runs as one shape, and the currency's mark in the middle as on a bank's
 * KHQR. The saved picture has no mark (it scanned less reliably at error
 * correction M, 2026-10-25); here Q (a quarter of the code can be lost)
 * easily covers the mark, about 3% of it. */
function QrCode({ code, currency, label }: { code: string; currency: Currency; label: string }) {
  const qr = useMemo(() => {
    const { size, data } = encode(code, { ecc: 'Q', border: 0 })
    let path = ''
    data.forEach((row, y) => {
      let x = 0
      while (x < size) {
        if (!row[x]) {
          x++
          continue
        }
        const from = x
        while (x < size && row[x]) x++
        path += `M${from} ${y}h${x - from}v1H${from}z`
      }
    })
    return { size, path }
  }, [code])
  const middle = qr.size / 2
  const mark = qr.size * 0.08 // the black circle's radius
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      shapeRendering="crispEdges"
      className="block w-full"
    >
      <path d={qr.path} fill="#000" />
      <g shapeRendering="auto">
        <circle cx={middle} cy={middle} r={mark * 1.3} fill="#fff" />
        <circle cx={middle} cy={middle} r={mark} fill="#000" />
        <text
          x={middle}
          y={middle}
          fill="#fff"
          fontSize={mark * 1.25}
          fontWeight={700}
          fontFamily="Inter, 'Noto Sans Khmer', sans-serif"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {currency === 'KHR' ? '៛' : '$'}
        </text>
      </g>
    </svg>
  )
}
