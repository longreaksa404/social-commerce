import { api, ApiError } from './api.ts'
import type { ImageUpload } from './types.ts'

const MAX_SIDE = 1600
const QUALITY = 0.85
const MAX_BYTES = 5 * 1024 * 1024
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Shrink a phone photo before upload: longest side 1600px, JPEG.
 * A 4 MB camera photo becomes ~300 KB, which uploads quickly on mobile
 * data and keeps the 5 MB server limit out of the way. Also turns HEIC
 * (where the browser can decode it) into JPEG.
 */
export async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new ApiError(422, 'INVALID_IMAGE', 'Please choose a photo.')
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file) // applies EXIF rotation
  } catch {
    if (UPLOAD_TYPES.includes(file.type) && file.size <= MAX_BYTES) return file
    throw new ApiError(422, 'INVALID_IMAGE', "This photo format isn't supported. Try a JPEG or PNG.")
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new ApiError(422, 'INVALID_IMAGE', "Couldn't read this photo.")
  // Keep the original if it was already small and in an accepted format.
  if (UPLOAD_TYPES.includes(file.type) && file.size <= blob.size) return file
  if (blob.size > MAX_BYTES) throw new ApiError(422, 'INVALID_IMAGE', 'This photo is too large.')
  return blob
}

/** Upload one prepared image for a product; returns its public URL.
 * The caller then saves the URL into the product's image_urls. */
export async function uploadProductImage(productId: string, image: Blob): Promise<string> {
  const upload = await api<ImageUpload>(`/seller/products/${productId}/images`, {
    method: 'POST',
    body: { content_type: image.type, size: image.size },
  })
  let response: Response
  try {
    response = await fetch(upload.upload_url, { method: 'PUT', headers: upload.headers, body: image })
  } catch {
    throw new ApiError(0, 'UPLOAD_FAILED', 'The photo upload failed. Check your connection and try again.')
  }
  if (!response.ok) throw new ApiError(response.status, 'UPLOAD_FAILED', 'The photo upload failed. Please try again.')
  return upload.public_url
}
