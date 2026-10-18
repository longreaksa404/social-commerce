/** A small still map of the pinned spot on the checkout page, so the
 * customer sees where they put it. Tapping it opens the map to move the
 * pin. Loaded only once there's a pin, like MapPicker. */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { LatLng } from './MapPicker.tsx'

const ZOOM = 17

export default function MapPreview({ location }: { location: LatLng }) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)

  useEffect(() => {
    const m = L.map(container.current!, {
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(m)
    // Only OpenStreetMap's credit is required; room is short here.
    m.attributionControl.setPrefix(false)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    map.current?.setView(location, ZOOM)
  }, [location])

  return (
    // `isolate` keeps Leaflet's layers (z-index 400+) inside this box, under
    // the full map and the page's header and Place order bar.
    <div className="relative isolate h-36 overflow-hidden rounded-xl bg-slate-100">
      <div ref={container} className="pointer-events-none absolute inset-0" />
      {/* The pin's tip marks the middle of the map. */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-[450] -translate-x-1/2 -translate-y-full">
        <MapPin aria-hidden className="size-9 fill-accent text-on-accent drop-shadow-md" strokeWidth={1.5} />
      </div>
    </div>
  )
}
