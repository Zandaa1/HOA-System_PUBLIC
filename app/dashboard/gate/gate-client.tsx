'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Car, Search, ShieldCheck, ShieldAlert, Home, User, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GateClientProps {
  initialVehicles: any[]
}

export function GateClient({ initialVehicles }: GateClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keep search input focused for rapid entry
  useEffect(() => {
    const focusSearch = () => searchInputRef.current?.focus()
    focusSearch()
    window.addEventListener('click', focusSearch)
    return () => window.removeEventListener('click', focusSearch)
  }, [])

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return []
    const q = searchQuery.toLowerCase()
    return initialVehicles.filter(v => 
      v.plate_number?.toLowerCase().includes(q) ||
      v.brand?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.property?.homeowners?.some((h: any) => 
        `${h.first_name} ${h.last_name}`.toLowerCase().includes(q)
      )
    )
  }, [searchQuery, initialVehicles])

  // Reset selection when search changes significantly
  useEffect(() => {
    setSelectedId(null)
  }, [searchQuery])

  const selectedVehicle = useMemo(() => {
    if (selectedId) return filteredVehicles.find(v => v.id === selectedId)
    if (filteredVehicles.length === 1) return filteredVehicles[0]
    return null
  }, [selectedId, filteredVehicles])

  const stickerStatus = useMemo(() => {
    if (!selectedVehicle) return null
    if (!selectedVehicle.is_active) {
      if (selectedVehicle.sticker_invoice_id) return 'unpaid'
      return 'inactive'
    }
    if (selectedVehicle.sticker_expires_at) {
      const expiry = new Date(selectedVehicle.sticker_expires_at)
      if (expiry.getTime() <= Date.now()) {
        return 'expired'
      }
    }
    return 'allowed'
  }, [selectedVehicle])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Search & Verification Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Search plate numbers or resident names for entry decisions.
          </p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            ref={searchInputRef}
            aria-label="Gate entry search"
            placeholder="TYPE PLATE OR NAME..."
            className="h-16 pl-14 text-2xl font-mono uppercase tracking-widest border-2 focus-visible:ring-primary shadow-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button 
              variant="ghost" 
              className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={() => {
                setSearchQuery('')
                setSelectedId(null)
              }}
            >
              CLEAR
            </Button>
          )}
        </div>

        {searchQuery && filteredVehicles.length > 1 && !selectedId ? (
          <div className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-200">
            <div className="flex items-center gap-2 text-status-pending bg-status-pending-bg p-3 rounded-lg border border-status-pending-border">
              <ShieldAlert className="size-5" />
              <p className="text-sm font-bold uppercase tracking-wider">Multiple matches found. Select correct vehicle:</p>
            </div>
            <div className="grid gap-3">
              {filteredVehicles.slice(0, 5).map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedId(vehicle.id)}
                  className="flex items-center justify-between p-6 bg-card border border-muted/60 hover:border-primary transition-all rounded-xl text-left group shadow-sm"
                >
                  <div className="flex items-center gap-6">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Car className="size-6 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-mono font-bold text-primary leading-none mb-1 uppercase tracking-tight">
                        {vehicle.plate_number}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground uppercase">
                        {vehicle.color} {vehicle.brand} {vehicle.model}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary uppercase">
                      Blk {vehicle.property.block}, Lot {vehicle.property.lot}
                    </p>
                    <Badge variant="secondary" className={cn(
                      "mt-1 text-[10px] font-bold uppercase border",
                      vehicle.is_active 
                        ? "bg-status-paid-bg text-status-paid border-status-paid-border" 
                        : "bg-status-overdue-bg text-status-overdue border-status-overdue-border"
                    )}>
                      {vehicle.is_active ? 'ALLOWED' : 'BLOCKED'}
                    </Badge>
                  </div>
                </button>
              ))}
              {filteredVehicles.length > 5 && (
                <p className="text-center text-xs text-muted-foreground uppercase font-bold pt-2">
                  + {filteredVehicles.length - 5} more matches. Refine your search.
                </p>
              )}
            </div>
          </div>
        ) : searchQuery && selectedVehicle ? (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200">
            <Card className={cn(
              "overflow-hidden border-2 shadow-xl",
              stickerStatus === 'allowed' ? "border-status-paid-border shadow-status-paid-border/20" : "border-destructive shadow-red-100/20"
            )}>
              <div className={cn(
                "p-8 text-center text-white space-y-2",
                stickerStatus === 'allowed' ? "bg-status-paid" : "bg-destructive"
              )}>
                <div className="flex justify-center mb-4">
                  {stickerStatus === 'allowed' ? (
                    <ShieldCheck className="size-20" />
                  ) : (
                    <ShieldAlert className="size-20" />
                  )}
                </div>
                <h2 className="text-5xl font-bold tracking-tight uppercase leading-none">
                  {stickerStatus === 'allowed' ? 'ALLOWED' : 'BLOCKED'}
                </h2>
                <p className="text-lg font-medium opacity-90 uppercase tracking-widest">
                  {stickerStatus === 'allowed' && 'Valid Subdivision Sticker'}
                  {stickerStatus === 'expired' && 'Sticker Expired'}
                  {stickerStatus === 'unpaid' && 'Sticker Unpaid / Billing Pending'}
                  {stickerStatus === 'inactive' && 'Access Restricted / Inactive'}
                </p>
              </div>
              <CardContent className="p-8 grid sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Plate Number</label>
                      <p className="text-3xl font-mono font-bold tracking-tight leading-none text-primary uppercase">
                        {selectedVehicle.plate_number}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Sticker Number</label>
                      <p className="text-xl font-bold tracking-tight text-primary">
                        {selectedVehicle.sticker_number || 'NONE'}
                      </p>
                      {selectedVehicle.sticker_expires_at && (
                        <p className={cn(
                          "text-[10px] font-medium mt-0.5",
                          stickerStatus === 'expired' ? "text-destructive font-bold" : "text-muted-foreground"
                        )}>
                          Expires: {new Date(selectedVehicle.sticker_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Vehicle Description</label>
                    <p className="text-xl font-bold">
                      {selectedVehicle.color} {selectedVehicle.brand} {selectedVehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">{selectedVehicle.vehicle_type}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-muted/50 rounded-xl border border-muted/60">
                    <div className="flex items-start gap-3">
                      <Home className="size-6 text-primary mt-1" />
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Destination</label>
                        <p className="text-xl font-bold text-primary">
                          Block {selectedVehicle.property.block}, Lot {selectedVehicle.property.lot}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedVehicle.property.street_address || 'Main Street'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="size-6 text-primary mt-1" />
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Registered To</label>
                      <p className="text-lg font-bold">
                        {selectedVehicle.property.homeowners?.[0] 
                          ? `${selectedVehicle.property.homeowners[0].first_name} ${selectedVehicle.property.homeowners[0].last_name}`
                          : 'Unknown Resident'}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedVehicle.property.homeowners?.[0]?.phone || 'No phone recorded'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 bg-muted border-t flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Verified vehicle</p>
                <Button variant="outline" size="sm" asChild className="h-9 px-4">
                  <Link href={`/dashboard/vehicles/${selectedVehicle.id}`}>
                    View Full Details <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        ) : searchQuery ? (
          <div className="py-20 text-center space-y-4 bg-muted/20 rounded-2xl border border-dashed border-muted/60">
            <div className="flex justify-center">
              <ShieldAlert className="size-16 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground uppercase tracking-tight">No Match Found</p>
              <p className="text-sm text-muted-foreground">Verify spelling or check visitor log</p>
            </div>
            <Button variant="outline" asChild className="h-9 px-4">
              <Link href="/dashboard/vehicles/new">Register New Vehicle</Link>
            </Button>
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 opacity-40">
            <Car className="size-20 mx-auto text-muted-foreground" />
            <p className="text-xl font-medium uppercase tracking-widest">Awaiting Plate Entry...</p>
          </div>
        )}
      </div>

      {/* Recent Activity Log */}
      <div className="space-y-6">
        <Card className="h-full border-muted/60 shadow-sm overflow-x-auto">
          <CardHeader className="border-b bg-muted/30 py-4 px-6">
            <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <Clock className="size-4 text-primary" />
              RECENT ENTRIES
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 min-w-full inline-block align-middle">
            <Table>
              <TableBody>
                {initialVehicles.slice(0, 10).map((vehicle) => (
                  <TableRow key={vehicle.id} className="group cursor-pointer hover:bg-muted/50 border-b last:border-0" onClick={() => {
                    setSearchQuery(vehicle.plate_number)
                  }}>
                    <TableCell className="py-4 px-6">
                      <p className="font-mono font-bold text-primary group-hover:underline uppercase tracking-tight">
                        {vehicle.plate_number}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">
                        {vehicle.brand} {vehicle.model}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge variant={vehicle.is_active ? "secondary" : "outline"} className={cn(
                        "text-[9px] font-bold px-1.5 py-0",
                        vehicle.is_active ? "bg-status-paid-bg text-status-paid border-status-paid-border" : "text-muted-foreground"
                      )}>
                        {vehicle.is_active ? "OK" : "NO"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="p-4 border-t bg-muted/5">
            <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground uppercase tracking-widest hover:bg-muted/50" asChild>
              <Link href="/dashboard/vehicles">View Full History</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
