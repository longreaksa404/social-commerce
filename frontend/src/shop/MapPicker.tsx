/** Full-screen map for pinning the delivery spot. The pin stays in the
 * middle; the customer moves the map under it, or taps ◎ to jump to where
 * the phone is. Works without location permission (move the map by hand).
 * Loaded only when opened (Leaflet + OpenStreetMap tiles, no API key). */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LoaderCircle, LocateFixed, MapPin, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'

export type LatLng = { lat: number; lng: number }

const PHNOM_PENH: LatLng = { lat: 11.5564, lng: 104.9282 }
const START_ZOOM = 13
const LOCATED_ZOOM = 18
// Closer than this and the pin can't tell one house from the next.
const CONFIRM_ZOOM = 16

export default function MapPicker({
  initial,
  onConfirm,
  onClose,
}: {
  initial: LatLng | null
  onConfirm: (location: LatLng) => void
  onClose: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [zoom, setZoom] = useState(initial ? LOCATED_ZOOM : START_ZOOM)
  // Until the customer moves the map (or ◎ finds them) the pin is just
  // the middle of Phnom Penh, not their house.
  const [placed, setPlaced] = useState(initial !== null)
  const [locating, setLocating] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const t = useT()
  const m = t.checkout.map

  function locate() {
    if (!('geolocation' in navigator)) {
      setProblem(m.noGeolocation)
      return
    }
    setLocating(true)
    setProblem(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        setPlaced(true)
        map.current?.setView([position.coords.latitude, position.coords.longitude], LOCATED_ZOOM)
      },
      (failure) => {
        setLocating(false)
        setProblem(
          failure.code === failure.PERMISSION_DENIED ? m.denied : m.notFound,
        )
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  // The map is made once; `initial` and `locate` only matter on opening.
  const opening = useRef({ initial, locate })
  useEffect(() => {
    const { initial, locate } = opening.current
    const m = L.map(container.current!, { zoomControl: false }).setView(
      initial ?? PHNOM_PENH,
      initial ? LOCATED_ZOOM : START_ZOOM,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    L.control.zoom({ position: 'topright' }).addTo(m)
    m.on('zoomend', () => setZoom(m.getZoom()))
    m.on('dragstart', () => {
      setPlaced(true)
      setProblem(null)
    })
    m.on('zoomstart', () => setPlaced(true))
    map.current = m
    if (!initial) locate()
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // A dialog: keyboard focus inside, Escape closes, the page behind doesn't scroll.
  useEffect(() => {
    closeButton.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function confirm() {
    const center = map.current?.getCenter().wrap()
    if (center) onConfirm({ lat: center.lat, lng: center.lng })
  }

  const ready = placed && zoom >= CONFIRM_ZOOM
  const hint = !placed ? m.hintMove : zoom < CONFIRM_ZOOM ? m.hintZoom : m.hintReady

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-picker-title"
      className="fixed inset-0 z-50 flex flex-col bg-surface"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-2 py-1.5">
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={m.close}
          className="flex size-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <X aria-hidden className="size-5" />
        </button>
        <h2 id="map-picker-title" className="text-base font-semibold text-slate-900">
          {m.title}
        </h2>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={container} className="absolute inset-0" aria-label={m.map} />
        {/* The pin's tip marks the middle of the map. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[450] -translate-x-1/2 -translate-y-full">
          <MapPin aria-hidden className="size-11 fill-accent text-white drop-shadow-md" strokeWidth={1.5} />
        </div>
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[440] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40" />

        {problem && (
          <p
            role="alert"
            className="absolute top-3 right-14 left-3 z-[1000] rounded-xl bg-surface px-3.5 py-2.5 text-sm text-slate-800 shadow-md"
          >
            {problem}
          </p>
        )}

        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label={m.locate}
          className="absolute right-3 bottom-6 z-[1000] flex size-12 items-center justify-center rounded-full bg-surface text-emerald-700 shadow-md hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          {locating ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
          ) : (
            <LocateFixed aria-hidden className="size-5" />
          )}
        </button>
      </div>

      <div className="border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p aria-live="polite" className="mb-2.5 text-sm text-slate-600">
          {hint}
        </p>
        <Button onClick={confirm} disabled={!ready} className="w-full">
          {m.confirm}
        </Button>
      </div>
    </div>
  )
}
