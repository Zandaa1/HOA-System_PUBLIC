'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, Download, Plus, Minus, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { saveMapBoundary } from './actions'

interface MapBorderEditorProps {
  initialGeometry: number[][][] | null
}

export function MapBorderEditor({ initialGeometry }: MapBorderEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const leafletLibRef = useRef<any>(null)
  const polygonRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const draggingIndexRef = useRef<number | null>(null)
  const geometryRef = useRef<number[][][]>(initialGeometry || [])

  const [geometry, setGeometry] = useState<number[][][]>(initialGeometry || [])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  const hasChanges = JSON.stringify(geometry) !== JSON.stringify(initialGeometry)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keep geometryRef in sync
  useEffect(() => {
    geometryRef.current = geometry
  }, [geometry])

  // ── Rebuild markers when geometry changes ───────────────────────────────
  const rebuildMarkers = useCallback((coords: number[][]) => {
    const L = leafletLibRef.current
    const map = leafletMapRef.current
    if (!L || !map) return

    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    coords.forEach((coord, i) => {
      const marker = L.circleMarker([coord[1], coord[0]], {
        radius: 8,
        color: '#ffffff',
        fillColor: selectedIndex === i ? '#ef4444' : '#6366f1',
        fillOpacity: 0.9,
        weight: 2,
        cursor: 'grab',
      }).addTo(map)

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e)
        setSelectedIndex(i)
      })

      // Manual drag support
      marker.on('mousedown', (e: any) => {
        L.DomEvent.stopPropagation(e)
        draggingIndexRef.current = i
        map.dragging.disable()
        marker.setStyle({ weight: 4, color: '#fbbf24', cursor: 'grabbing' })
      })

      markersRef.current.push(marker)
    })
  }, [selectedIndex])

  // ── Update polygon on geometry change ───────────────────────────────────
  const updatePolygon = useCallback((coords: number[][]) => {
    const L = leafletLibRef.current
    const map = leafletMapRef.current
    if (!L || !map) return

    if (polygonRef.current) {
      map.removeLayer(polygonRef.current)
    }

    if (coords.length >= 3) {
      const latLngs = coords.map(c => [c[1], c[0]] as [number, number])
      polygonRef.current = L.polygon(latLngs, {
        color: '#6366f1',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 8',
        fillColor: '#6366f1',
        fillOpacity: 0.05,
      }).addTo(map)
    }

    rebuildMarkers(coords)
  }, [rebuildMarkers])

  // ── Initialize map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !mapRef.current || leafletMapRef.current) return

    const init = async () => {
      if (!mapRef.current) return

      const leaflet = await import('leaflet')
      const L = leaflet.default ?? leaflet
      leafletLibRef.current = L

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        center: [0.001, 0.001],
        zoom: 16,
        zoomControl: false,
      })
      leafletMapRef.current = map

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Map-level drag handlers for vertex dragging
      map.on('mousemove', (e: any) => {
        const idx = draggingIndexRef.current
        if (idx === null) return
        const marker = markersRef.current[idx]
        if (!marker) return
        marker.setLatLng(e.latlng)
        // Update polygon live
        const coords = geometryRef.current[0]
        if (coords) {
          const newCoords = [...coords]
          newCoords[idx] = [e.latlng.lng, e.latlng.lat]
          if (polygonRef.current) {
            polygonRef.current.setLatLngs(
              newCoords.map(c => [c[1], c[0]] as [number, number])
            )
          }
        }
      })

      map.on('mouseup', () => {
        const idx = draggingIndexRef.current
        if (idx === null) return
        draggingIndexRef.current = null
        map.dragging.enable()
        const marker = markersRef.current[idx]
        if (marker) {
          marker.setStyle({ weight: 2, color: '#ffffff', cursor: 'grab' })
          const pos = marker.getLatLng()
          const coords = geometryRef.current[0]
          if (coords) {
            const newCoords = [...coords]
            newCoords[idx] = [pos.lng, pos.lat]
            setGeometry([newCoords])
          }
        }
      })

      // Render initial geometry
      if (geometry.length > 0 && geometry[0].length > 0) {
        updatePolygon(geometry[0])
      }
    }

    init()

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // ── Redraw when geometry/selection changes ───────────────────────────────
  useEffect(() => {
    if (!mounted || !leafletMapRef.current) return
    if (geometry.length > 0 && geometry[0].length > 0) {
      updatePolygon(geometry[0])
    }
  }, [geometry, selectedIndex, mounted, updatePolygon])

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleAddVertex = () => {
    if (selectedIndex === null || geometry.length === 0) return
    const coords = [...geometry[0]]
    const i = selectedIndex
    const nextI = (i + 1) % coords.length
    const midLng = (coords[i][0] + coords[nextI][0]) / 2
    const midLat = (coords[i][1] + coords[nextI][1]) / 2
    coords.splice(nextI, 0, [midLng, midLat])
    setGeometry([coords])
    setSelectedIndex(nextI)
  }

  const handleRemoveVertex = () => {
    if (selectedIndex === null || geometry.length === 0) return
    const coords = [...geometry[0]]
    if (coords.length <= 3) {
      toast.error('Polygon must have at least 3 vertices')
      return
    }
    coords.splice(selectedIndex, 1)
    setGeometry([coords])
    setSelectedIndex(null)
  }

  const handleSave = async () => {
    if (geometry.length === 0) {
      toast.error('No geometry to save')
      return
    }
    try {
      await saveMapBoundary(geometry)
      toast.success('Map boundary saved')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    }
  }

  const handleExport = () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: geometry,
      },
    }
    const fc = {
      type: 'FeatureCollection',
      features: [feature],
    }
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hoa_demo_boundary.geojson'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('GeoJSON exported')
  }

  const handleReset = () => {
    setGeometry(initialGeometry || [])
    setSelectedIndex(null)
    toast.info('Reverted to initial geometry')
  }

  const handleVertexClickTable = (i: number) => {
    setSelectedIndex(i)
    // Pan to the vertex
    const map = leafletMapRef.current
    if (map && geometry.length > 0 && geometry[0][i]) {
      map.flyTo([geometry[0][i][1], geometry[0][i][0]], map.getZoom(), { animate: true, duration: 0.4 })
    }
  }

  if (!mounted) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground text-sm">
          Loading map...
        </CardContent>
      </Card>
    )
  }

  const coords = geometry.length > 0 ? geometry[0] : []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Subdivision Boundary Editor</CardTitle>
              <CardDescription className="text-xs">
                Click vertices to select, drag to move. Use buttons to add or remove points.
              </CardDescription>
            </div>
            {hasChanges && (
              <Badge variant="secondary" className="text-[10px] font-bold bg-amber-100 text-amber-700 border-amber-200">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Map */}
          <div
            ref={mapRef}
            className="h-[500px] w-full rounded-lg border border-muted/60 overflow-hidden"
          />

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddVertex}
              disabled={selectedIndex === null}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Vertex
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemoveVertex}
              disabled={selectedIndex === null}
              className="gap-1.5"
            >
              <Minus className="size-3.5" />
              Remove Vertex
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges}
              className="gap-1.5"
            >
              <RotateCw className="size-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={coords.length === 0}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Export GeoJSON
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || coords.length === 0}
              className="gap-1.5"
            >
              <Save className="size-3.5" />
              Save Boundary
            </Button>
          </div>

          {/* Coordinate Table */}
          {coords.length > 0 && (
            <div className="max-h-60 overflow-y-auto rounded-lg border border-muted/60">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground">Longitude</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground">Latitude</th>
                  </tr>
                </thead>
                <tbody>
                  {coords.map((c, i) => (
                    <tr
                      key={i}
                      onClick={() => handleVertexClickTable(i)}
                      className={`cursor-pointer transition-colors ${
                        selectedIndex === i
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono">{c[0].toFixed(6)}</td>
                      <td className="px-3 py-1.5 font-mono">{c[1].toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {coords.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No boundary geometry loaded. Add a GeoJSON file or draw a polygon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
