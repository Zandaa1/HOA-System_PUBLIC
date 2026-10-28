'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBranding, DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { MapPinned, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getFileUrl } from '@/lib/storage/shared'
import { PROPERTY_STATUS_LABELS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/status-badge'

interface PropertyMarker {
  id: string
  block: string
  lot: string
  phase: string | null
  status: string
  latitude: number
  longitude: number
  photo_url: string | null
  street_address: string | null
  lot_area_sqm: number | null
  floor_area_sqm: number | null
  property_type: { name: string; color: string } | null
}

interface AmenityMarker {
  id: string
  name: string
  description: string | null
  latitude: number
  longitude: number
  is_active: boolean
  photo_url: string | null
}

interface PropertyMapProps {
  properties: PropertyMarker[]
  amenities: AmenityMarker[]
  defaultCenter: [number, number]
  defaultZoom: number
  activeRentersByProperty: Record<string, boolean>
}

export function PropertyMap({
  properties,
  amenities,
  defaultCenter,
  defaultZoom,
  activeRentersByProperty,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const leafletLibRef = useRef<any>(null)
  const boundaryRef = useRef<any>(null)
  const selectionMarkerRef = useRef<any>(null)

  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null)
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityMarker | null>(null)
  const [geoStatus, setGeoStatus] = useState<{ type: 'valid' | 'invalid'; msg: string } | null>(null)
  const [propertyDetails, setPropertyDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadBranding() {
      const supabase = createClient()
      const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
      if (settings) setBranding(getBranding(settings))
    }
    loadBranding()
  }, [])

  useEffect(() => {
    if (selectedProperty && !propertyDetails) {
      setLoadingDetails(true)
      fetch(`/api/properties/${selectedProperty.id}`)
        .then(res => res.json())
        .then(data => setPropertyDetails(data))
        .catch(console.error)
        .finally(() => setLoadingDetails(false))
    } else if (!selectedProperty) {
      setPropertyDetails(null)
    }
  }, [selectedProperty, propertyDetails])

  useEffect(() => {
    if (!mounted || !mapRef.current || leafletMapRef.current) return

    let L: any
    let turf: any
    let boundaryGeoJSON: any

    const init = async () => {
      // Dynamic imports — all client-side only
      const [leaflet, turfLib] = await Promise.all([
        import('leaflet'),
        import('@turf/turf'),
      ])
      L = leaflet.default ?? leaflet
      leafletLibRef.current = L
      turf = turfLib

      // Fix Leaflet's broken default icon paths in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Fetch boundary — DB first, static file fallback
      const { getMapBoundary } = await import('@/app/developer/actions')
      const coords = await getMapBoundary()
      if (coords) {
        boundaryGeoJSON = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: coords },
          }],
        }
      } else {
        const res = await fetch('/data/hoa_demo_boundary.geojson')
        boundaryGeoJSON = await res.json()
      }
      const boundaryFeature = boundaryGeoJSON.features[0]

      // Create map
      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false,
      })
      leafletMapRef.current = map

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Base tile layer — switching back to a more reliable standard OSM provider
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map)

      // ── Render subdivision boundary ──────────────────────────────────────────
      const boundaryLayer = L.geoJSON(boundaryGeoJSON, {
        style: {
          color: '#6366f1',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 8',
          fillColor: '#6366f1',
          fillOpacity: 0.05,
        },
      }).addTo(map)
      
      boundaryLayer.bindTooltip(`${branding.hoaFullName} Boundary`, {
        sticky: true,
        className: 'text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border shadow-sm',
      })
      boundaryRef.current = boundaryLayer

      // ── Property markers ─────────────────────────────────────────────────────
      const zoomToMarker = (lat: number, lng: number) => {
        const targetZoom = Math.max(map.getZoom(), 17)
        map.flyTo([lat, lng], targetZoom, {
          animate: true,
          duration: 0.6,
        })
      }

      properties.forEach((p) => {
        const hasRenter = activeRentersByProperty[p.id]
        const effectiveStatus = (p.status === 'occupied' && hasRenter) ? 'occupied_renter' : p.status
        const LEGACY_STATUS_HEX: Record<string, string> = { occupied: '#2b9a66', vacant: '#5c6b73', for_sale: '#2a5d89', for_rent: '#c47419', occupied_renter: '#2a5d89' }
        const color = effectiveStatus === 'occupied_renter' ? LEGACY_STATUS_HEX.occupied_renter : (p.property_type?.color || LEGACY_STATUS_HEX[p.status] || '#6b7280')
        
        const circle = L.circleMarker([p.latitude, p.longitude], {
          radius: 10,
          color: '#ffffff',
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map)

        circle.on('click', () => {
          zoomToMarker(p.latitude, p.longitude)
          setSelectedProperty(p)
          setSelectedAmenity(null)
        })
      })

      // ── Amenity markers ──────────────────────────────────────────────────────
      amenities.forEach((a) => {
        const circle = L.circleMarker([a.latitude, a.longitude], {
          radius: 12,
          color: '#ffffff',
          fillColor: '#7c3aed',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map)

        circle.on('click', () => {
          zoomToMarker(a.latitude, a.longitude)
          setSelectedAmenity(a)
          setSelectedProperty(null)
        })
      })

      // ── Map click handler: Select nearest property/amenity ──────────────────
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        const clickedPoint = turf.point([lng, lat])
        const isInside = !boundaryFeature || turf.booleanPointInPolygon(clickedPoint, boundaryFeature)

        if (isInside) {
          // Find nearest property or amenity within 50 meters
          let nearestItem: any = null
          let minDistance = Infinity
          let itemType: 'property' | 'amenity' | null = null

          properties.forEach((p) => {
            const dist = turf.distance(clickedPoint, turf.point([p.longitude, p.latitude]), { units: 'meters' })
            if (dist < minDistance) {
              minDistance = dist
              nearestItem = p
              itemType = 'property'
            }
          })

          amenities.forEach((a) => {
            const dist = turf.distance(clickedPoint, turf.point([a.longitude, a.latitude]), { units: 'meters' })
            if (dist < minDistance) {
              minDistance = dist
              nearestItem = a
              itemType = 'amenity'
            }
          })

          if (nearestItem && minDistance < 50) {
            zoomToMarker(nearestItem.latitude, nearestItem.longitude)
            if (itemType === 'property') {
              setSelectedProperty(nearestItem)
              setSelectedAmenity(null)
            } else {
              setSelectedAmenity(nearestItem)
              setSelectedProperty(null)
            }
          }
        } else {
          setGeoStatus({ type: 'invalid', msg: 'Outside subdivision boundary.' })
        }
        setTimeout(() => setGeoStatus(null), 3000)
      })
    }

    init().catch(console.error)

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [mounted, properties, amenities, defaultCenter, defaultZoom])

  useEffect(() => {
    if (leafletMapRef.current) {
      // Delay to allow CSS transition (500ms) to complete
      const timer = setTimeout(() => {
        leafletMapRef.current.invalidateSize({ animate: true })
      }, 550)
      return () => clearTimeout(timer)
    }
  }, [selectedProperty, selectedAmenity, isFullscreen])

  // ── Selection marker ──────────────────────────────────────────────────────
  useEffect(() => {
    const L = leafletLibRef.current
    const map = leafletMapRef.current
    if (!L || !map) return

    if (selectionMarkerRef.current) {
      map.removeLayer(selectionMarkerRef.current)
      selectionMarkerRef.current = null
    }

    const item = selectedProperty || selectedAmenity
    if (!item) return

    const color = selectedProperty ? '#2563eb' : '#7c3aed'

    // Pulsing circle at the selected item's location
    const marker = L.circleMarker([item.latitude, item.longitude], {
      radius: 16,
      color: color,
      fillColor: color,
      fillOpacity: 0.15,
      weight: 3,
      dashArray: '4, 4',
    }).addTo(map)

    marker.bindTooltip(
      selectedProperty
        ? `Block ${selectedProperty.block}, Lot ${selectedProperty.lot}`
        : selectedAmenity?.name || '',
      { permanent: false, direction: 'top', offset: [0, -18] }
    )

    selectionMarkerRef.current = marker

    return () => {
      if (selectionMarkerRef.current && map) {
        map.removeLayer(selectionMarkerRef.current)
        selectionMarkerRef.current = null
      }
    }
  }, [selectedProperty, selectedAmenity])

  if (!mounted) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl border bg-muted/30 mx-6">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Initializing Map</p>
        </div>
      </div>
    )
  }

  const hasSelection = Boolean(selectedProperty || selectedAmenity)

  return (
    <div className={cn('flex flex-col lg:flex-row gap-6')}>
      {/* Sidebar — Refined Institutional Design with Adaptive Height */}
      <div
        className={cn(
          'order-2 lg:order-1 flex-none space-y-6 overflow-hidden transition-all duration-500 ease-in-out',
          hasSelection ? 'lg:w-1/3 xl:w-1/4 opacity-100' : 'lg:w-0 opacity-0 pointer-events-none'
        )}
      >
        {selectedProperty && (
          <div className="h-[calc(100vh-200px)] flex flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-500">
            <Card className="flex-1 shadow-md border-muted/60 overflow-hidden ring-1 ring-primary/5 flex flex-col">
              <div className="relative h-40 shrink-0 w-full bg-muted">
                {selectedProperty.photo_url ? (
                  <img
                    src={getFileUrl(selectedProperty.photo_url)}
                    alt={`Exterior`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                    <MapPinned className="size-10" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge
                    variant="secondary"
                    className="shadow-lg border-white/20 backdrop-blur-md font-bold text-[9px] tracking-widest uppercase py-0.5 px-2.5"
                    style={{
                      backgroundColor: `var(--status-${activeRentersByProperty[selectedProperty.id] ? 'partial' : selectedProperty.status})`,
                      color: '#ffffff',
                    }}
                  >
                    {PROPERTY_STATUS_LABELS[activeRentersByProperty[selectedProperty.id] ? 'occupied_renter' : selectedProperty.status]}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="p-5 pb-2 shrink-0">
                <CardTitle className="text-xl font-bold tracking-tight">
                  Block {selectedProperty.block}, Lot {selectedProperty.lot}
                  {selectedProperty.phase && <span className="text-muted-foreground/60 font-medium ml-1.5">Ph {selectedProperty.phase}</span>}
                </CardTitle>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                  <MapPinned className="size-3" />
                  {selectedProperty.street_address || 'Address not registered'}
                </p>
              </CardHeader>

              <CardContent className="p-5 pt-3 space-y-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                
                {loadingDetails && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
                    </div>
                  </div>
                )}
                
                {propertyDetails && !loadingDetails && (
                  <>
                {/* Residents Section */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                    Residents
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">
                      {(propertyDetails.homeowners?.length || 0) + (propertyDetails.renters?.filter((r: any) => r.is_active).length || 0)} total
                    </span>
                  </h3>
                  <div className="grid gap-2">
                    {propertyDetails.homeowners?.map((owner: any) => (
                      <div key={owner.id} className="flex flex-col p-2.5 rounded-lg border bg-muted/30 border-muted/60 gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-primary truncate">{owner.first_name} {owner.last_name}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase">Owner</p>
                          </div>
                          <Badge variant="outline" className="text-[8px] font-bold bg-white px-1.5 h-4 uppercase">Owner</Badge>
                        </div>
                        {(owner.phone || owner.email) && (
                          <div className="flex flex-col gap-1 pt-1.5 border-t border-muted/40">
                            {owner.phone && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                                <span className="opacity-70">Phone:</span> {owner.phone}
                              </p>
                            )}
                            {owner.email && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium truncate">
                                <span className="opacity-70">Email:</span> {owner.email}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {propertyDetails.renters?.filter((r: any) => r.is_active).map((renter: any) => (
                      <div key={renter.id} className="flex flex-col p-2.5 rounded-lg border bg-blue-50/30 border-blue-100/50 gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-blue-900 truncate">{renter.first_name} {renter.last_name}</p>
                            <p className="text-[9px] text-blue-700/60 font-bold uppercase">Tenant</p>
                          </div>
                          <Badge variant="secondary" className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1.5 h-4 uppercase">Renter</Badge>
                        </div>
                        {(renter.phone || renter.email) && (
                          <div className="flex flex-col gap-1 pt-1.5 border-t border-blue-100/50">
                            {renter.phone && (
                              <p className="text-[10px] text-blue-800/70 flex items-center gap-1.5 font-medium">
                                <span className="opacity-70">Phone:</span> {renter.phone}
                              </p>
                            )}
                            {renter.email && (
                              <p className="text-[10px] text-blue-800/70 flex items-center gap-1.5 font-medium truncate">
                                <span className="opacity-70">Email:</span> {renter.email}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg border border-muted/60 bg-muted/10">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Lot Area</p>
                    <p className="text-xs font-bold">{selectedProperty.lot_area_sqm ? `${selectedProperty.lot_area_sqm} sqm` : 'N/A'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-muted/60 bg-muted/10">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Floor Area</p>
                    <p className="text-xs font-bold">{selectedProperty.floor_area_sqm ? `${selectedProperty.floor_area_sqm} sqm` : 'N/A'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-muted/60 bg-muted/10">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Vehicles</p>
                    <p className="text-lg font-bold leading-tight">{propertyDetails.vehicles?.length || 0}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-muted/60 bg-muted/10">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Type</p>
                    <p className="text-xs font-bold truncate">{selectedProperty.property_type?.name || 'N/A'}</p>
                  </div>
                </div>

                {/* Internal Vehicles List if any */}
                {(propertyDetails.vehicles?.length || 0) > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registered Vehicles</h3>
                    <div className="space-y-1.5">
                      {propertyDetails.vehicles?.map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between px-2 py-1.5 rounded-md border border-muted/40 text-[11px]">
                          <span className="font-mono font-bold">{v.plate_number}</span>
                          <span className="text-muted-foreground text-[10px]">{v.brand} {v.model}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}
              </CardContent>

              <div className="p-5 pt-0 shrink-0 flex flex-col gap-2 mt-auto border-t border-muted/40 bg-muted/5">
                <Button asChild className="w-full h-10 font-bold text-xs">
                  <Link href={`/dashboard/properties/${selectedProperty.id}`}>
                    View Full Record
                  </Link>
                </Button>

              </div>
            </Card>
          </div>
        )}

        {selectedAmenity && (
          <div className="h-[calc(100vh-200px)] flex flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-500">
            <Card className="flex-1 border-violet-200 bg-violet-50/50 shadow-md overflow-hidden ring-1 ring-violet-500/20 flex flex-col">
              <div className="relative h-40 shrink-0 w-full bg-violet-100">
                {selectedAmenity.photo_url ? (
                  <img
                    src={getFileUrl(selectedAmenity.photo_url)}
                    alt={selectedAmenity.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-violet-400">
                    <MapPinned className="size-10" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-violet-600 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 shadow-lg">
                    {selectedAmenity.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <CardHeader className="p-5 pb-2 shrink-0">
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Community Amenity</p>
                <CardTitle className="text-xl font-bold tracking-tight mt-1">{selectedAmenity.name}</CardTitle>
              </CardHeader>

              <CardContent className="p-5 pt-3 space-y-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-200/50">
                <p className="text-sm text-violet-900/80 leading-relaxed">
                  {selectedAmenity.description || 'No description available for this facility.'}
                </p>
              </CardContent>

              <div className="p-5 pt-0 shrink-0 border-t border-violet-200/30">
                <Button asChild className="w-full h-10 bg-violet-600 hover:bg-violet-700 font-bold shadow-sm shadow-violet-200 text-xs">
                  <Link href={`/dashboard/amenities/${selectedAmenity.id}`}>
                    Details & Manage Bookings
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Map — Optimized Cockpit Container */}
      <div className={cn(
        'order-1 lg:order-2 flex-1 transition-all duration-500 relative z-0',
        isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''
      )}>
        <div className={cn(
          'relative overflow-hidden rounded-2xl border border-muted/60 shadow-xl group transition-all duration-500',
          isFullscreen ? 'h-full w-full rounded-none border-none' : 'h-[calc(100vh-200px)]'
        )}>
          {/* Controls overlay */}
          <div className="absolute right-6 top-6 z-[1000] flex flex-col gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="size-11 rounded-xl shadow-2xl ring-1 ring-black/5 hover:scale-105 active:scale-95 transition-all bg-white/90 backdrop-blur-md"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize className="size-5 text-primary" /> : <Maximize className="size-5 text-primary" />}
            </Button>
          </div>

          {/* Status feedback */}
          {geoStatus && (
            <div className={cn(
              'absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl border backdrop-blur-md transition-all motion-safe:animate-in motion-safe:slide-in-from-bottom-4',
              geoStatus.type === 'valid'
                ? 'bg-green-50/90 text-green-700 border-green-200'
                : 'bg-red-50/90 text-red-700 border-red-200'
            )}>
              <span className="mr-2">{geoStatus.type === 'valid' ? '✓' : '✕'}</span>
              {geoStatus.msg}
            </div>
          )}

          {/* Map Legend Overlay */}
          <div className="absolute bottom-6 left-6 z-[1000] flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-primary bg-white/90 backdrop-blur-md p-3 rounded-xl border border-black/5 shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
            {Object.entries(PROPERTY_STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="size-2.5 rounded-full shadow-sm" style={{ backgroundColor: `var(--status-${key === 'occupied_renter' ? 'partial' : key})` }} />
                <span className="uppercase tracking-tight opacity-80">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 border-l border-black/10 pl-4">
              <div className="size-2.5 rounded-full bg-[#7c3aed] shadow-sm" />
              <span className="uppercase tracking-tight opacity-80">Amenity</span>
            </div>
          </div>

          {/* Map canvas */}
          <div ref={mapRef} className="h-full w-full z-0" />
          
          {/* Overlay gradient for depth */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.02)]" />
        </div>
      </div>
    </div>
  )
}
