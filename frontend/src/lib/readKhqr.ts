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

/** The text in a QR picture, or null. Big photos are scaled down first;
 * screenshots read as they are. */
export async function readQrImage(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  for (const size of [1200, 2400]) {
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, width, height)
    const found = jsQR(ctx.getImageData(0, 0, width, height).data, width, height)
    if (found) return found.data
    if (scale === 1) break
  }
  return null
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
