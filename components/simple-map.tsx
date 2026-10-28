'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

interface SimpleMapProps {
  latitude: number
  longitude: number
  zoom?: number
  markerLabel?: string
}

export function SimpleMap({
  latitude,
  longitude,
  zoom = 17,
  markerLabel,
}: SimpleMapProps) {
  const [mounted, setMounted] = useState(false)
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet').MapContainer
    TileLayer: typeof import('react-leaflet').TileLayer
    Marker: typeof import('react-leaflet').Marker
    Popup: typeof import('react-leaflet').Popup
  } | null>(null)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([reactLeaflet, leaflet]) => {
      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
      })
      setL(leaflet.default || leaflet)
      setMounted(true)
    })
  }, [])

  if (!mounted || !MapComponents) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
        <p className="text-muted-foreground text-sm">Loading map...</p>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents

  const icon = L ? L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  }) : undefined

  return (
    <Card className="overflow-hidden border-2">
      <div className="aspect-video w-full relative z-0">
        <MapContainer
          center={[latitude, longitude]}
          zoom={zoom}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]} icon={icon}>
            {markerLabel && <Popup>{markerLabel}</Popup>}
          </Marker>
        </MapContainer>
      </div>
    </Card>
  )
}
