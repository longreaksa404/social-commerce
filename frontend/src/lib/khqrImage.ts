import { encode } from 'uqr'

/** On an iPhone or iPad: saving a picture to Photos goes through the
 * share sheet. */
export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

// The color of the KHQR mark, for the card's header.
const KHQR_RED = '#E1232E'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Khmer", sans-serif'

/** The code as one picture: KHQR header, who is paid, the amount, the QR,
 * and which order it's for, so a saved copy explains itself in the photo
 * gallery. */
export function drawKhqr({ code, name, amount, caption }: { code: string; name: string; amount: string; caption: string }) {
  const qr = encode(code, { ecc: 'M', border: 0 })
  const width = 600
  const pad = 48
  const cell = Math.floor((width - pad * 2) / qr.size)
  const qrSize = cell * qr.size
  const header = 96
  const qrTop = header + 200 // 50px of white above the code (its quiet zone)
  const height = qrTop + qrSize + 96

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = KHQR_RED
  ctx.fillRect(0, 0, width, header)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 44px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('KHQR', pad, header / 2)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#334155'
  ctx.font = `600 28px ${FONT}`
  ctx.fillText(name, pad, header + 56)
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

  const left = Math.round((width - qrSize) / 2)
  ctx.fillStyle = '#000000'
  qr.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(left + x * cell, qrTop + y * cell, cell, cell)
    }),
  )

  ctx.fillStyle = '#64748b'
  ctx.font = `500 24px ${FONT}`
  ctx.textAlign = 'center'
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
