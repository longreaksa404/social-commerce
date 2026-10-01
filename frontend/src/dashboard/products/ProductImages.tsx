import { useRef, useState, type ChangeEvent } from 'react'
import { Button, Card, ErrorMessage } from '../../components/ui.tsx'
import { api, ApiError } from '../../lib/api.ts'
import type { ImageUpload, Product } from '../../lib/types.ts'
import { useSaveProduct } from '../queries.ts'

const MAX_IMAGES = 5
const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Upload flow (02_TECHNICAL.md section 11): ask the API for a presigned
 * URL, PUT the file straight to R2, then add its public URL to the product.
 * The first image is the main one.
 */
export function ProductImages({ product }: { product: Product }) {
  const save = useSaveProduct()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const urls = product.image_urls

  const setUrls = (image_urls: string[]) => save.mutateAsync({ id: product.id, body: { image_urls } })

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setError(null)

    const problem = files.find((f) => !TYPES.includes(f.type))
      ? 'Photos must be JPEG, PNG, or WebP.'
      : files.find((f) => f.size > MAX_BYTES)
        ? 'Each photo must be 5 MB or smaller.'
        : urls.length + files.length > MAX_IMAGES
          ? `A product can have up to ${MAX_IMAGES} photos.`
          : null
    if (problem) {
      setError(new ApiError(422, 'INVALID_IMAGE', problem))
      return
    }

    setUploading(true)
    let current = urls
    try {
      for (const file of files) {
        const upload = await api<ImageUpload>(`/seller/products/${product.id}/images`, {
          method: 'POST',
          body: { content_type: file.type, size: file.size },
        })
        const response = await fetch(upload.upload_url, { method: 'PUT', headers: upload.headers, body: file })
        if (!response.ok) throw new ApiError(response.status, 'UPLOAD_FAILED', 'The photo upload failed. Please try again.')
        current = (await setUrls([...current, upload.public_url])).image_urls
      }
    } catch (err) {
      setError(err instanceof TypeError ? new ApiError(0, 'UPLOAD_FAILED', 'The photo upload failed. Please try again.') : err)
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || save.isPending
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Photos</h2>
        <span className="text-xs text-slate-500">
          {urls.length}/{MAX_IMAGES}
        </span>
      </div>
      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {urls.map((url, index) => (
            <div key={url} className="space-y-1">
              <div className="relative">
                <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-xs text-white">Main</span>
                )}
              </div>
              <div className="flex gap-1 text-xs">
                {index > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-slate-600 hover:text-slate-900"
                    onClick={() => setUrls([url, ...urls.filter((u) => u !== url)]).catch(setError)}
                  >
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="ml-auto text-red-600 hover:text-red-700"
                  onClick={() => setUrls(urls.filter((u) => u !== url)).catch(setError)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden onChange={upload} />
      <Button variant="secondary" disabled={busy || urls.length >= MAX_IMAGES} onClick={() => input.current?.click()}>
        {uploading ? 'Uploading…' : 'Add photos'}
      </Button>
      <p className="text-xs text-slate-500">JPEG, PNG, or WebP, up to 5 MB each.</p>
      <ErrorMessage error={error} />
    </Card>
  )
}
