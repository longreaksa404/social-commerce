import { api, ApiError } from './api.ts'
import type { ImageUpload } from './types.ts'

const MAX_SIDE = 1600
const QUALITY = 0.85
const MAX_BYTES = 5 * 1024 * 1024
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// The small copy for grids and lists: its short side, enough for a
// half-screen tile on a sharp phone screen; a few dozen KB.
const THUMB_SHORT_SIDE = 480
const THUMB_QUALITY = 0.8
const MAX_THUMB_BYTES = 512 * 1024

/** A photo ready to upload, with its small copy when one could be made. */
export type PreparedPhoto = { image: Blob; thumbnail: Blob | null }

/** The small copy of a product photo, for grids and lists. Photos uploaded
 * with one are named "...-m.<ext>" and the copy "...-s.jpg" next to it
 * (the API's ImageUploadOut); older photos have none and are used as they
 * are. ProductImage falls back to the full photo if the copy won't load. */
export function thumbnailUrl(url: string): string
export function thumbnailUrl(url: string | null | undefined): string | null | undefined
export function thumbnailUrl(url: string | null | undefined) {
  return url?.replace(/-m\.(jpg|png|webp)$/, '-s.jpg')
}

function toJpeg(source: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // JPEG has no transparency
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * Shrink a phone photo before upload: longest side 1600px, JPEG.
 * A 4 MB camera photo becomes ~300 KB, which uploads quickly on mobile
 * data and keeps the 5 MB server limit out of the way. Also turns HEIC
 * (where the browser can decode it) into JPEG.
 */
export async function prepareImage(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new ApiError(422, 'INVALID_IMAGE', 'Please choose a photo.')
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file) // applies EXIF rotation
  } catch {
    if (UPLOAD_TYPES.includes(file.type) && file.size <= MAX_BYTES) return { image: file, thumbnail: null }
    throw new ApiError(422, 'INVALID_IMAGE', "This photo format isn't supported. Try a JPEG or PNG.")
  }

  const { width, height } = bitmap
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const blob = await toJpeg(bitmap, Math.round(width * scale), Math.round(height * scale), QUALITY)
  const thumbScale = Math.min(1, THUMB_SHORT_SIDE / Math.min(width, height))
  const thumb = await toJpeg(bitmap, Math.round(width * thumbScale), Math.round(height * thumbScale), THUMB_QUALITY)
  bitmap.close()

  if (!blob) throw new ApiError(422, 'INVALID_IMAGE', "Couldn't read this photo.")
  const thumbnail = thumb && thumb.size <= MAX_THUMB_BYTES ? thumb : null
  // Keep the original if it was already small and in an accepted format.
  if (UPLOAD_TYPES.includes(file.type) && file.size <= blob.size) return { image: file, thumbnail }
  if (blob.size > MAX_BYTES) throw new ApiError(422, 'INVALID_IMAGE', 'This photo is too large.')
  return { image: blob, thumbnail }
}

/** Upload one prepared image for a product; returns its public URL.
 * The caller then saves the URL into the product's image_urls. */
export async function uploadProductImage(productId: string, { image, thumbnail }: PreparedPhoto): Promise<string> {
  const upload = await api<ImageUpload>(`/seller/products/${productId}/images`, {
    method: 'POST',
    body: { content_type: image.type, size: image.size, thumbnail_size: thumbnail?.size ?? null },
  })
  // The small copy first: a photo named as having one must have it.
  if (thumbnail && upload.thumbnail_upload_url) {
    await put(upload.thumbnail_upload_url, { 'Content-Type': 'image/jpeg' }, thumbnail)
  }
  await put(upload.upload_url, upload.headers, image)
  return upload.public_url
}

async function put(url: string, headers: Record<string, string>, body: Blob) {
  let response: Response
  try {
    response = await fetch(url, { method: 'PUT', headers, body })
  } catch {
    throw new ApiError(0, 'UPLOAD_FAILED', 'The photo upload failed. Check your connection and try again.')
  }
  if (!response.ok) throw new ApiError(response.status, 'UPLOAD_FAILED', 'The photo upload failed. Please try again.')
}
