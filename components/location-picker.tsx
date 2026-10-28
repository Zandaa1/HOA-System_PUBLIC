'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { MapPin, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getBranding, DEFAULT_BRANDING } from '@/lib/branding'

interface LocationPickerProps {
  latitude: string
  longitude: string
  onChange: (lat: string, lng: string) => void
  onAddressSelect?: (address: string) => void
  label?: string
}

// ── Boundary GeoJSON cached at module level across all instances ──────────────
let boundaryCache: GeoJSON.Feature | null = null
async function getBoundary(): Promise<GeoJSON.Feature | null> {
  if (boundaryCache) return boundaryCache
  const { getMapBoundary } = await import('@/app/developer/actions')
  const coords = await getMapBoundary()
  if (coords) {
    boundaryCache = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: coords },
    } as GeoJSON.Feature
  } else {
    const res = await fetch('/data/hoa_demo_boundary.geojson')
    const fc = await res.json()
    boundaryCache = fc.features[0] as GeoJSON.Feature
  }
  return boundaryCache || null
}

async function isInsideBoundary(lat: number, lng: number): Promise<boolean> {
  const [turf, boundary] = await Promise.all([import('@turf/turf'), getBoundary()])
  // Leaflet: [lat, lng] → Turf/GeoJSON: [lng, lat]
  return !boundary || turf.booleanPointInPolygon(turf.point([lng, lat]), boundary as any)
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  onAddressSelect,
  label = 'Property Location',
}: LocationPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [geoStatus, setGeoStatus] = useState<{ type: 'valid' | 'invalid'; msg: string } | null>(null)
  const [hoaFullName, setHoaFullName] = useState(DEFAULT_BRANDING.hoaFullName)
  const geoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet').MapContainer
    TileLayer: typeof import('react-leaflet').TileLayer
    Marker: typeof import('react-leaflet').Marker
    useMap: typeof import('react-leaflet').useMap
    useMapEvents: typeof import('react-leaflet').useMapEvents
  } | null>(null)
  const [L, setL] = useState<any>(null)
  const [mapLoadError, setMapLoadError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.from('system_settings').select('setting_key, setting_value').then(({ data }) => {
      if (data) {
        const b = getBranding(data)
        setHoaFullName(b.hoaFullName)
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ])
      .then(([reactLeaflet, leaflet]) => {
        if (cancelled) return
        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          useMap: reactLeaflet.useMap,
          useMapEvents: reactLeaflet.useMapEvents,
        })
        setL(leaflet.default || leaflet)
      })
      .catch((err) => {
        console.error('Map picker load error:', err)
        if (!cancelled) setMapLoadError('Unable to load map picker.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const center: [number, number] = useMemo(() => {
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
    return [0.001, 0.001]
  }, [latitude, longitude])

  const showStatus = useCallback((type: 'valid' | 'invalid', msg: string) => {
    if (geoTimerRef.current) clearTimeout(geoTimerRef.current)
    setGeoStatus({ type, msg })
    geoTimerRef.current = setTimeout(() => setGeoStatus(null), 3000)
  }, [])

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!onAddressSelect) return
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'HOA System' } }
      )
      const data = await res.json()
      if (data?.display_name) onAddressSelect(data.display_name)
    } catch (err) {
      console.error('Reverse geocoding error:', err)
    }
  }, [onAddressSelect])

  const handlePlace = useCallback(async (lat: number, lng: number, map?: any) => {
    const inside = await isInsideBoundary(lat, lng)
    if (!inside) {
      showStatus('invalid', 'Location is outside the subdivision boundary.')
      return
    }
    onChange(lat.toFixed(8), lng.toFixed(8))
    reverseGeocode(lat, lng)
    if (map) map.flyTo([lat, lng], map.getZoom())
    showStatus('valid', `Pin set at ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
  }, [onChange, reverseGeocode, showStatus])

  // ── Inner component: renders the boundary polygon on the map ─────────────────
  const BoundaryLayer = useCallback(() => {
    if (!MapComponents || !L) return null
    const { useMap } = MapComponents
    const map = useMap()

    useEffect(() => {
      let layer: any = null
      getBoundary().then((feature) => {
        layer = L.geoJSON(feature, {
          style: {
            color: '#4f46e5',     // indigo-600 — solid, prominent
            weight: 4,
            opacity: 1,
            fillColor: '#6366f1',
            fillOpacity: 0.10,
          },
        }).addTo(map)
        layer.bindTooltip(`${hoaFullName} Boundary`, {
          sticky: true,
        })
      })
      return () => { if (layer) map.removeLayer(layer) }
    }, [map])

    return null
  }, [MapComponents, L])

  // ── Inner component: draggable marker + click handler ────────────────────────
  const LocationMarker = useCallback(() => {
    if (!MapComponents) return null
    const { Marker, useMapEvents } = MapComponents

    const map = useMapEvents({
      click(e) { handlePlace(e.latlng.lat, e.latlng.lng, map) },
    })

    const position: [number, number] | null =
      latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : null
    if (!position || isNaN(position[0]) || isNaN(position[1])) return null

    const icon = L
      ? L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        })
      : undefined

    return (
      <Marker
        position={position}
        draggable={true}
        icon={icon}
        eventHandlers={{
          dragend: (e) => {
            const pos = e.target.getLatLng()
            handlePlace(pos.lat, pos.lng)
          },
        }}
      />
    )
  }, [MapComponents, latitude, longitude, L, handlePlace])

  if (!mounted || !MapComponents) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex h-[300px] items-center justify-center rounded-lg border bg-muted">
          <p className={cn('text-sm', mapLoadError ? 'text-destructive' : 'text-muted-foreground')}>
            {mapLoadError || 'Loading map picker...'}
          </p>
        </div>
      </div>
    )
  }

  const { MapContainer, TileLayer } = MapComponents

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          {label}
        </Label>
        <div className="text-[10px] text-muted-foreground font-mono">
          {latitude || '0.00000000'}, {longitude || '0.00000000'}
        </div>
      </div>

      <Card className={cn(
        'overflow-hidden border-2 transition-all duration-300',
        isFullscreen ? 'fixed inset-0 z-30 p-4 bg-background' : 'relative z-0'
      )}>
        <div className={cn('w-full relative z-0', isFullscreen ? 'h-full' : 'h-[300px] sm:h-[400px] lg:h-[500px]')}>
          {/* Fullscreen toggle */}
          <div className="absolute right-4 top-4 z-[1000]">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="shadow-md"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </Button>
          </div>

          {/* Geofence feedback toast */}
          {geoStatus && (
            <div className={cn(
              'absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full text-xs font-semibold shadow-lg border backdrop-blur-sm pointer-events-none',
              geoStatus.type === 'valid'
                ? 'bg-green-50/90 text-green-700 border-green-200'
                : 'bg-red-50/90 text-red-700 border-red-200'
            )}>
              {geoStatus.type === 'valid' ? '✓' : '✕'} {geoStatus.msg}
            </div>
          )}

          <MapContainer center={center} zoom={16} scrollWheelZoom={true} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Boundary must render before the marker so it sits below it */}
            <BoundaryLayer />
            <LocationMarker />
          </MapContainer>
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground italic">
        Click inside the indigo boundary to set location, or drag the marker. Pins outside the subdivision will be rejected.
      </p>
    </div>
  )
}
