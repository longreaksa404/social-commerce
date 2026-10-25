import jsQR from 'jsqr'

/** What a seller's own bank QR says about where KHQR money goes
 * (Settings → Payments, "Upload your bank's QR", 2026-10-14): read on the
 * phone, nothing is uploaded. */
export type KhqrAccount = {
  bakongAccountId: string
  /** ABA and some banks: the account number, with the bank's shared ID. */
  accountInformation: string
  acquiringBank: string
  /** The account's name, as the bank wrote it (English letters). */
  name: string
  currency: 'USD' | 'KHR' | null
}

export type KhqrProblem = 'no_qr' | 'not_khqr' | 'business'

/** Every QR's text in a picture (at most 4), none found = []. A bank's
 * "dual" KHQR has two side by side, dollars and riel (founder's test list
 * #20, 2026-10-24): each one found is painted over and the picture read
 * again, then each half on its own, as jsQR reads one code at a time and
 * can miss both when two share a picture. Big photos are scaled down
 * first; screenshots read as they are. */
export async function readQrImages(file: File): Promise<string[]> {
  const bitmap = await createImageBitmap(file)
  const found = new Set<string>()
  for (const size of [1200, 2400]) {
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return []
    ctx.drawImage(bitmap, 0, 0, width, height)
    // The whole picture, covering each code once read.
    for (let i = 0; i < 4; i++) {
      const code = jsQR(ctx.getImageData(0, 0, width, height).data, width, height)
      if (!code) break
      found.add(code.data)
      cover(ctx, code.location)
    }
    // Each half: left and right, top and bottom.
    if (found.size < 2) {
      ctx.drawImage(bitmap, 0, 0, width, height)
      const halves: [number, number, number, number][] = [
        [0, 0, Math.ceil(width / 2), height],
        [Math.floor(width / 2), 0, Math.ceil(width / 2), height],
        [0, 0, width, Math.ceil(height / 2)],
        [0, Math.floor(height / 2), width, Math.ceil(height / 2)],
      ]
      for (const [x, y, w, h] of halves) {
        const code = jsQR(ctx.getImageData(x, y, w, h).data, w, h)
        if (code) found.add(code.data)
      }
    }
    if (found.size > 0 || scale === 1) break
  }
  bitmap.close()
  return [...found].slice(0, 4)
}

type Point = { x: number; y: number }

/** Paint a read code over in white, with a margin, so the next read finds
 * the other one. */
function cover(
  ctx: CanvasRenderingContext2D,
  at: { topLeftCorner: Point; topRightCorner: Point; bottomRightCorner: Point; bottomLeftCorner: Point },
) {
  const corners = [at.topLeftCorner, at.topRightCorner, at.bottomRightCorner, at.bottomLeftCorner]
  const xs = corners.map((p) => p.x)
  const ys = corners.map((p) => p.y)
  const margin = (Math.max(...xs) - Math.min(...xs)) * 0.15
  ctx.fillStyle = '#fff'
  ctx.fillRect(
    Math.min(...xs) - margin,
    Math.min(...ys) - margin,
    Math.max(...xs) - Math.min(...xs) + 2 * margin,
    Math.max(...ys) - Math.min(...ys) + 2 * margin,
  )
}

/** EMVCo's tag-length-value fields, one level. */
function fields(text: string): Map<string, string> | null {
  const out = new Map<string, string>()
  let i = 0
  while (i < text.length) {
    const tag = text.slice(i, i + 2)
    const length = Number(text.slice(i + 2, i + 4))
    if (!/^\d\d$/.test(tag) || !Number.isInteger(length) || i + 4 + length > text.length) return null
    out.set(tag, text.slice(i + 4, i + 4 + length))
    i += 4 + length
  }
  return out
}

/** KHQR's checksum (CRC-16/CCITT-FALSE), as app/services/khqr.py makes it. */
function crc16(text: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** The account in a KHQR from the seller's bank app, or what's wrong. */
export function parseKhqr(text: string | null): KhqrAccount | KhqrProblem {
  if (!text) return 'no_qr'
  const top = fields(text)
  if (!top || !top.has('63') || crc16(text.slice(0, -4)) !== text.slice(-4).toUpperCase()) return 'not_khqr'
  // 29: an individual's account; 30: a business (merchant) account, which
  // needs details this form doesn't take.
  const individual = top.get('29')
  if (!individual) return top.has('30') ? 'business' : 'not_khqr'
  const account = fields(individual)
  const bakongAccountId = account?.get('00') ?? ''
  if (!bakongAccountId.includes('@')) return 'not_khqr'
  const currency = top.get('53')
  return {
    bakongAccountId,
    accountInformation: account?.get('01') ?? '',
    acquiringBank: account?.get('02') ?? '',
    name: (top.get('59') ?? '').replace(/[^ -~]/g, '').trim().slice(0, 25),
    currency: currency === '840' ? 'USD' : currency === '116' ? 'KHR' : null,
  }
}

/** Every account in a KHQR: one, or two for a "dual" code. Wing's dual
 * KHQR (the founder's own, 2026-10-25) is one code for a riel and a
 * dollar account: tag 29 holds one of them, in tag 53's currency, and
 * Wing's own tag 42 lists both (its 02 and 03) with 04 "Dual". The one
 * that isn't tag 29's is then the other currency's account, at the same
 * Bakong ID, bank and name. Other banks' dual codes may differ: they read
 * as their one account until a sample shows how. */
export function parseKhqrAccounts(text: string | null): KhqrAccount[] | KhqrProblem {
  const account = parseKhqr(text)
  if (typeof account === 'string') return account
  const extra = text && fields(text)?.get('42')
  const dual = extra ? fields(extra) : null
  if (!dual || dual.get('04')?.toLowerCase() !== 'dual' || !account.currency) return [account]
  const numbers = [dual.get('02'), dual.get('03')]
  const other = numbers.find((n) => n && n !== account.accountInformation)
  if (!other || !numbers.includes(account.accountInformation)) return [account]
  return [account, { ...account, accountInformation: other, currency: account.currency === 'USD' ? 'KHR' : 'USD' }]
}
