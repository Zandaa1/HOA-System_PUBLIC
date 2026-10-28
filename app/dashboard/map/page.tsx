
import { createClient } from '@/lib/supabase/server'
import { MapWrapper } from './map-wrapper'

export default async function MapPage() {
  const supabase = await createClient()

  const [{ data: properties }, { data: settings }, { data: amenities }, { data: occupancyData }] = await Promise.all([
    supabase
      .from('properties')
      .select(`
        id,
        block,
        lot,
        phase,
        status,
        latitude,
        longitude,
        photo_url,
        street_address,
        lot_area_sqm,
        floor_area_sqm,
        property_type:property_types(name, color)
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null),
    supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['default_map_lat', 'default_map_lng', 'default_map_zoom']),
    supabase
      .from('amenities')
      .select('id, name, description, latitude, longitude, is_active, photo_url')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null),
    supabase
      .from('renters')
      .select('property_id, is_active')
      .eq('is_active', true),
  ])

  const settingsMap = (settings || []).reduce(
    (acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }),
    {} as Record<string, string>
  )

  const defaultCenter: [number, number] = [
    parseFloat(settingsMap.default_map_lat || '0.001'),
    parseFloat(settingsMap.default_map_lng || '0.001'),
  ]
  const defaultZoom = parseInt(settingsMap.default_map_zoom || '16', 10)

  const activeRentersByProperty = (occupancyData || []).reduce(
    (acc, r) => {
      acc[r.property_id] = true
      return acc
    },
    {} as Record<string, boolean>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold tracking-tight text-primary">Property Map</h1>
        <p className="text-xs text-muted-foreground font-medium">{properties?.length || 0} mapped</p>
      </div>

      <MapWrapper
        properties={properties || []}
        amenities={amenities || []}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        activeRentersByProperty={activeRentersByProperty}
      />
    </div>
  )
}
