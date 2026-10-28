'use client'

import dynamic from 'next/dynamic'
import * as React from 'react'

const PropertyMap = dynamic(
  () => import('./property-map').then((mod) => mod.PropertyMap),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full bg-muted/50 animate-pulse rounded-lg border border-muted flex items-center justify-center text-muted-foreground font-medium">
        Loading Map View...
      </div>
    )
  }
)

interface MapWrapperProps {
  properties: any[]
  amenities: any[]
  defaultCenter: [number, number]
  defaultZoom: number
  activeRentersByProperty: Record<string, boolean>
}

export function MapWrapper(props: MapWrapperProps) {
  return <PropertyMap {...props} />
}
