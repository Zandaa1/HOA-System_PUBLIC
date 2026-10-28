'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'

interface Booking {
  id: string
  booking_date: string
  booked_by_name: string
  start_time: string
  end_time: string
  status: string
  amenity_name: string | null
  amenity_color: string | null
}

interface DashboardCalendarProps {
  initialBookings: Booking[]
  initialYear: number
  initialMonth: number // 0-indexed
}

export function DashboardCalendar({
  initialBookings,
  initialYear,
  initialMonth,
}: DashboardCalendarProps) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [bookings, setBookings] = useState<Booking[]>(
    Array.isArray(initialBookings) ? initialBookings : []
  )
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Detect mobile for initial view
  useEffect(() => {
    if (window.innerWidth < 768) setView('list')
  }, [])

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDow = firstDay.getDay() // 0=Sun

  const monthName = firstDay.toLocaleString('default', { month: 'long' })

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Fetch bookings when month changes
  useEffect(() => {
    const firstStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    setLoading(true)
    fetch(`/api/calendar-bookings?from=${firstStr}&to=${lastStr}`)
      .then(r => r.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setBookings([])
        setLoading(false)
      })
  }, [year, month, daysInMonth])

  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-7" onClick={prevMonth}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-sm font-semibold min-w-[100px] text-center">
            {monthName} {year}
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={nextMonth}>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex bg-muted p-1 rounded-md border shadow-sm">
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="size-8 shrink-0"
              onClick={() => setView('grid')}
              title="Grid view"
            >
              <LayoutGrid className="size-4" />
              <span className="sr-only">Grid</span>
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="size-8 shrink-0"
              onClick={() => setView('list')}
              title="List view"
            >
              <List className="size-4" />
              <span className="sr-only">List</span>
            </Button>
          </div>
          <Button size="sm" asChild className="h-8 text-xs px-3">
            <Link href="/dashboard/amenities/bookings/new">
              <Plus className="size-3.5 mr-1.5" />
              Book
            </Link>
          </Button>
        </div>
      </div>

      <CardContent className="p-0 flex-1 min-h-[300px]">
        {view === 'grid' ? (
          <>
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-b text-[10px] font-bold uppercase text-muted-foreground bg-muted/20">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="py-1.5 text-center">{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className={`grid grid-cols-7 ${loading ? 'opacity-50' : ''}`}>
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="h-[68px] sm:h-[80px] bg-muted/10 border-r border-b last:border-r-0" />
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayBookings = bookings.filter(b => b.booking_date === dateStr)
                const isToday = dateStr === todayStr

                return (
                  <div
                    key={dateStr}
                    className="h-[68px] sm:h-[80px] p-1 border-r border-b last:border-r-0 overflow-hidden hover:bg-muted/5 transition-colors"
                  >
                    <span className={`text-[11px] font-semibold inline-flex items-center justify-center size-5 rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                      }`}>
                      {day}
                    </span>
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {dayBookings.slice(0, 2).map(b => (
                        <Link
                          key={b.id}
                          href={`/dashboard/amenities/bookings/${b.id}`}
                          title={`${b.amenity_name ?? 'Booking'} · ${b.booked_by_name}\n${b.start_time}–${b.end_time} · ${b.status}`}
                        >
                          <div
                            className="group/pill relative text-[9px] px-1 py-0.5 rounded truncate leading-tight border-l-2 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                            style={{ borderLeftColor: b.amenity_color || 'var(--status-partial)' }}
                          >
                            <span className="font-semibold">{b.amenity_name ?? 'Booking'}</span>
                          </div>
                        </Link>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[9px] text-muted-foreground pl-1">
                          +{dayBookings.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-muted-foreground italic">No bookings for this month.</p>
              </div>
            ) : (
              // Group by date
              Object.entries(
                bookings.reduce((acc, b) => {
                  if (!acc[b.booking_date]) acc[b.booking_date] = []
                  acc[b.booking_date].push(b)
                  return acc
                }, {} as Record<string, Booking[]>)
              ).map(([date, dayBookings]) => {
                const d = new Date(date)
                const isToday = date === todayStr

                return (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {d.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {isToday && ' · Today'}
                      </span>
                      <div className="h-px bg-muted flex-1" />
                    </div>
                    <div className="grid gap-2">
                      {dayBookings.map(b => (
                        <Link
                          key={b.id}
                          href={`/dashboard/amenities/bookings/${b.id}`}
                          className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-2 rounded-full" style={{ backgroundColor: b.amenity_color || 'var(--status-partial)' }} />
                            <div>
                              <p className="text-[11px] font-bold leading-none">{b.amenity_name ?? 'Booking'}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{b.booked_by_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium">{b.start_time}–{b.end_time}</p>
                            <StatusBadge type="booking" status={b.status} className="text-[9px] h-3.5 mt-0.5 px-1" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </CardContent>

      {/* Legend */}
      <div className="flex gap-3 px-3 py-2 border-t text-[10px] text-muted-foreground">
        {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
          <div key={status} className="flex items-center gap-1 capitalize">
            <div className="size-1.5 rounded-full" style={{ backgroundColor: `var(--status-${status === 'cancelled' ? 'inactive' : status})` }} />
            {status}
          </div>
        ))}
        <Link href="/dashboard/amenities/calendar" className="ml-auto text-primary hover:underline text-[10px]">
          Full calendar →
        </Link>
      </div>
    </Card>
  )
}
