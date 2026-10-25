import { encode } from 'uqr'

/** On an iPhone or iPad: saving a picture to Photos goes through the
 * share sheet. */
export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

// The color of the KHQR mark, for the card's header.
const KHQR_RED = '#E1232E'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Khmer", sans-serif'

/** The code as one picture, in the standard KHQR card's look (founder's
 * pick 24A, 2026-10-25): the red header with its corner tab, who is paid,
 * the amount, a dashed line, the QR, and which order it's for, so a saved
 * copy explains itself in the photo gallery. Drawn at twice its size,
 * sharp in a saved photo. No mark in the code's middle: it scanned less
 * reliably (tried 2026-10-25). */
export function drawKhqr({ code, name, amount, caption }: { code: string; name: string; amount: string; caption: string }) {
  const qr = encode(code, { ecc: 'M', border: 0 })
  const scale = 2
  const width = 600
  const pad = 48
  const cell = (width - pad * 2) / qr.size
  const qrSize = cell * qr.size
  const header = 96
  const tab = 28 // the header's corner tab, under its right end
  const qrTop = header + 200 // 50px of white above the code (its quiet zone)
  const height = qrTop + qrSize + 96

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = KHQR_RED
  ctx.fillRect(0, 0, width, header)
  ctx.beginPath()
  ctx.moveTo(width - tab * 2, header)
  ctx.lineTo(width, header)
  ctx.lineTo(width, header + tab)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 44px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('KHQR', pad, header / 2)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#334155'
  ctx.font = `600 28px ${FONT}`
  ctx.fillText(fit(ctx, name, width - pad * 2), pad, header + 56)
  ctx.fillStyle = '#0f172a'
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(amount, pad, header + 122)

  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(pad, header + 150)
  ctx.lineTo(width - pad, header + 150)
  ctx.stroke()
  ctx.setLineDash([])

  const left = (width - qrSize) / 2
  ctx.fillStyle = '#000000'
  qr.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      // A hair wider, so no seams show between cells at any size.
      if (dark) ctx.fillRect(left + x * cell, qrTop + y * cell, cell + 0.5, cell + 0.5)
    }),
  )

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#64748b'
  ctx.font = `500 24px ${FONT}`
  ctx.fillText(fit(ctx, caption, width - pad * 2), width / 2, qrTop + qrSize + 60)

  return { canvas, url: canvas.toDataURL('image/png') }
}

/** `text`, shortened with an ellipsis to fit `max` pixels. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let end = text.length
  while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > max) end--
  return `${text.slice(0, end)}…`
}
