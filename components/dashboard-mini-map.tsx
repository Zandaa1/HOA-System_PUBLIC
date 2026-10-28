'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Maximize2 } from 'lucide-react'

interface PropertyMarker {
  id: string
  block: string
  lot: string
  status: string
  latitude: number
  longitude: number
  color: string
}

interface AmenityMarker {
  id: string
  name: string
  latitude: number
  longitude: number
}

interface DashboardMiniMapProps {
  properties: PropertyMarker[]
  amenities: AmenityMarker[]
  center: [number, number]
  zoom: number
}

export function DashboardMiniMap({ properties, amenities, center, zoom }: DashboardMiniMapProps) {
  const [mounted, setMounted] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet').MapContainer
    TileLayer: typeof import('react-leaflet').TileLayer
    CircleMarker: typeof import('react-leaflet').CircleMarker
    Popup: typeof import('react-leaflet').Popup
  } | null>(null)

  useEffect(() => {
    Promise.all([
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([rl]) => {
      setMapComponents({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        CircleMarker: rl.CircleMarker,
        Popup: rl.Popup,
      })
      setMounted(true)
    })
  }, [])

  if (!mounted || !MapComponents) {
    return (
      <Card className="flex items-center justify-center h-[350px] bg-muted/30">
        <p className="text-xs text-muted-foreground">Loading map…</p>
      </Card>
    )
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = MapComponents

  const legend = [
    { label: 'Occupied',  color: 'var(--status-paid)' },
    { label: 'Vacant',    color: 'var(--status-inactive)' },
    { label: 'For Sale',  color: 'var(--status-partial)' },
    { label: 'For Rent',  color: 'var(--status-pending)' },
    { label: 'Amenity',   color: 'var(--sidebar-primary)' },
  ]

  return (
    <Card className="overflow-hidden relative h-[350px] w-full z-0">
      {/* Full-map link overlay */}
      <Link
        href="/dashboard/map"
        className="absolute top-2 right-2 z-[1000] flex items-center gap-1 text-[10px] bg-white/90 backdrop-blur-sm border shadow-sm rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Maximize2 className="size-3" />
        Full map
      </Link>

      {/* Unlock Overlay for Mobile */}
      {!unlocked && (
        <div 
          className="absolute inset-0 z-[1001] bg-black/10 flex items-center justify-center cursor-pointer group sm:hidden"
          onClick={() => setUnlocked(true)}
        >
          <div className="bg-white shadow-xl border rounded-full px-5 py-2.5 text-[12px] font-semibold text-primary flex items-center gap-2 group-active:scale-95 transition-all">
            Tap to interact with map
          </div>
        </div>
      )}

      {/* Floating legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm border shadow-sm rounded-md px-2.5 py-2 space-y-1">
        {legend.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-700 leading-none">{label}</span>
          </div>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={unlocked}
        scrollWheelZoom={unlocked}
        dragging={unlocked}
        doubleClickZoom={unlocked}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {properties.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={8} // Increased for touch
            pathOptions={{ color: p.color, fillColor: p.color, fillOpacity: 0.75, weight: 1.5 }}
          >
            <Popup>
              <div className="text-center">
                <p className="text-xs font-bold leading-none">Blk {p.block} Lot {p.lot}</p>
                <Link href={`/dashboard/properties/${p.id}`} className="text-[10px] text-primary hover:underline mt-1 block">View details</Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {amenities.map((a) => (
          <CircleMarker
            key={a.id}
            center={[a.latitude, a.longitude]}
            radius={10} // Increased for touch
            pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <div className="text-center">
                <p className="text-xs font-bold text-violet-700 leading-none">{a.name}</p>
                <Link href={`/dashboard/amenities/${a.id}`} className="text-[10px] text-primary hover:underline mt-1 block">View amenity</Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </Card>
  )
}
