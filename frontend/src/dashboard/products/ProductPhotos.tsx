import { ImagePlus, LoaderCircle, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { ApiError } from '../../lib/api.ts'
import { prepareImage, uploadProductImage } from '../../lib/images.ts'
import type { Product } from '../../lib/types.ts'
import { useSaveProduct } from '../queries.ts'

const MAX_PHOTOS = 5
const TOO_MANY = `A product can have up to ${MAX_PHOTOS} photos.`

export type LocalPhoto = { key: string; image: Blob; preview: string }

type GridPhoto = { key: string; src: string }

/** Photo tiles: 3 per row on phones. The first photo is the main one. */
function PhotoGrid({
  photos,
  uploading = 0,
  disabled = false,
  onAdd,
  onRemove,
  onMakeMain,
}: {
  photos: GridPhoto[]
  uploading?: number
  disabled?: boolean
  onAdd: (files: File[]) => void
  onRemove: (key: string) => void
  onMakeMain: (key: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const room = MAX_PHOTOS - photos.length - uploading

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length) onAdd(files)
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {photos.map((photo, index) => (
        <div key={photo.key} className="relative aspect-square">
          <img src={photo.src} alt="" className="size-full rounded-xl object-cover ring-1 ring-slate-200" />
          {index === 0 ? (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              Main
            </span>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onMakeMain(photo.key)}
              className="absolute bottom-1.5 left-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 after:absolute after:-inset-2 disabled:opacity-50"
            >
              Set main
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            aria-label={`Remove photo ${index + 1}`}
            onClick={() => onRemove(photo.key)}
            className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 after:absolute after:-inset-1.5 disabled:opacity-50"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ))}
      {Array.from({ length: uploading }, (_, i) => (
        <div
          key={`uploading-${i}`}
          role="status"
          className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-slate-400"
        >
          <LoaderCircle aria-hidden className="size-6 animate-spin" />
          <span className="sr-only">Uploading photo</span>
        </div>
      ))}
      {room > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-emerald-500 hover:text-emerald-700 active:bg-slate-50 disabled:opacity-50"
        >
          <ImagePlus aria-hidden className="size-6" />
          <span className="text-xs font-medium">Add photo</span>
        </button>
      )}
      {/* image/*: phones offer the camera as well as the gallery. */}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={pick} />
    </div>
  )
}

/** Photos of a product that already exists: each change is saved at once. */
export function ProductPhotos({ product }: { product: Product }) {
  const save = useSaveProduct()
  const { toast, confirm } = useFeedback()
  const [uploading, setUploading] = useState(0)
  const urls = product.image_urls

  const setUrls = async (image_urls: string[]) =>
    (await save.mutateAsync({ id: product.id, body: { image_urls } })).image_urls

  async function add(files: File[]) {
    const accepted = files.slice(0, MAX_PHOTOS - urls.length)
    if (accepted.length < files.length) toast(TOO_MANY, 'error')
    setUploading(accepted.length)
    let current = urls
    try {
      for (const file of accepted) {
        const url = await uploadProductImage(product.id, await prepareImage(file))
        current = await setUrls([...current, url])
        setUploading((n) => n - 1)
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'The photo upload failed. Please try again.', 'error')
    } finally {
      setUploading(0)
    }
  }

  async function remove(url: string) {
    const ok = await confirm({ title: 'Remove this photo?', confirmLabel: 'Remove', danger: true })
    if (!ok) return
    await setUrls(urls.filter((u) => u !== url)).catch((err) => toast(err.message, 'error'))
  }

  return (
    <PhotoGrid
      photos={urls.map((url) => ({ key: url, src: url }))}
      uploading={uploading}
      disabled={uploading > 0 || save.isPending}
      onAdd={add}
      onRemove={remove}
      onMakeMain={(url) => setUrls([url, ...urls.filter((u) => u !== url)]).catch((err) => toast(err.message, 'error'))}
    />
  )
}

/** Photos picked while creating a product; uploaded after it is saved. */
export function NewProductPhotos({
  photos,
  onChange,
}: {
  photos: LocalPhoto[]
  onChange: (photos: LocalPhoto[]) => void
}) {
  const { toast } = useFeedback()
  const [preparing, setPreparing] = useState(0)

  async function add(files: File[]) {
    const accepted = files.slice(0, MAX_PHOTOS - photos.length)
    if (accepted.length < files.length) toast(TOO_MANY, 'error')
    setPreparing(accepted.length)
    const added: LocalPhoto[] = []
    for (const file of accepted) {
      try {
        const image = await prepareImage(file)
        added.push({ key: crypto.randomUUID(), image, preview: URL.createObjectURL(image) })
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Couldn't read this photo.", 'error')
      }
      setPreparing((n) => n - 1)
    }
    setPreparing(0)
    onChange([...photos, ...added])
  }

  function remove(key: string) {
    const photo = photos.find((p) => p.key === key)
    if (photo) URL.revokeObjectURL(photo.preview)
    onChange(photos.filter((p) => p.key !== key))
  }

  return (
    <PhotoGrid
      photos={photos.map((p) => ({ key: p.key, src: p.preview }))}
      uploading={preparing}
      onAdd={add}
      onRemove={remove}
      onMakeMain={(key) => onChange([...photos.filter((p) => p.key === key), ...photos.filter((p) => p.key !== key)])}
    />
  )
}
