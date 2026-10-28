'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Users, Clock, MapPin, Eye, Building2, Search, X } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { getFileUrl } from '@/lib/storage/shared'

interface Amenity {
  id: string
  name: string
  description: string | null
  location: string | null
  capacity: number | null
  hourly_rate: number
  half_day_rate: number
  full_day_rate: number
  requires_deposit: boolean
  deposit_amount: number
  is_active: boolean
  photo_url: string | null
}

interface AmenitiesGridProps {
  amenities: Amenity[]
}

export function AmenitiesGrid({ amenities }: AmenitiesGridProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return amenities
    const q = query.toLowerCase()
    return amenities.filter((a) =>
      a.name?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q)
    )
  }, [amenities, query])

  return (
    <>
      <div className="px-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search amenities by name, description, or location..."
            className="h-10 pl-9 pr-9"
            aria-label="Search amenities"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {query && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing {filtered.length} of {amenities.length} amenities
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6">
          <EmptyState
            title={query ? 'No matching amenities' : 'No Amenities Yet'}
            description={
              query
                ? `No amenities match "${query}". Try a different search term.`
                : "You don't have any subdivision amenities or facilities defined. Create one (e.g., Clubhouse, Swimming Pool, Tennis Court) to start booking amenities."
            }
            icon={Building2}
            actionLabel={query ? undefined : 'Add Amenity'}
            actionHref={query ? undefined : '/dashboard/amenities/new'}
          />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 px-6">
          {filtered.map((amenity) => (
            <Card key={amenity.id} className="shadow-sm border-muted/60 overflow-hidden transition-all hover:shadow-md flex flex-col">
              <div className="relative h-40 shrink-0 bg-muted">
                {amenity.photo_url ? (
                  <img
                    src={getFileUrl(amenity.photo_url)}
                    alt={amenity.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/20">
                    <MapPin className="size-12" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge
                    variant={amenity.is_active ? 'secondary' : 'outline'}
                    className={`shadow-lg backdrop-blur-md text-[9px] font-bold tracking-widest ${amenity.is_active ? 'bg-green-600/90 text-white border-none' : 'bg-white/90 text-muted-foreground'}`}
                  >
                    {amenity.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg font-bold text-primary">{amenity.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed line-clamp-2 min-h-[40px]">
                  {amenity.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-5 flex-1 flex flex-col">
                <div className="flex items-center gap-4 text-xs font-medium">
                  {amenity.location && (
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[150px]">
                      <MapPin className="size-3.5 text-primary/60" />
                      <span>{amenity.location}</span>
                    </div>
                  )}
                  {amenity.capacity && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3.5 text-primary/60" />
                      <span>{amenity.capacity} pax</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-2 text-center border border-muted/60">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Hourly</p>
                    <p className="text-xs font-bold text-primary">
                      ₱{Number(amenity.hourly_rate).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2 text-center border border-muted/60">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Half</p>
                    <p className="text-xs font-bold text-primary">
                      ₱{Number(amenity.half_day_rate).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2 text-center border border-muted/60">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Full</p>
                    <p className="text-xs font-bold text-primary">
                      ₱{Number(amenity.full_day_rate).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                  {amenity.requires_deposit && (
                    <p className="text-[10px] font-bold text-status-pending bg-status-pending-bg px-2 py-1 rounded border border-status-pending-border inline-block uppercase tracking-tight">
                      Requires ₱{Number(amenity.deposit_amount).toLocaleString()} deposit
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1 h-9 font-bold text-xs">
                      <Link href={`/dashboard/amenities/${amenity.id}`}>
                        <Eye className="mr-2 size-4" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="flex-1 h-9 font-bold text-xs">
                      <Link href={`/dashboard/amenities/bookings?amenity_id=${amenity.id}`}>
                        <Clock className="mr-2 size-4" />
                        Bookings
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="size-9 p-0">
                      <Link href={`/dashboard/amenities/${amenity.id}/edit`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
