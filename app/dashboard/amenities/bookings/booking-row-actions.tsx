'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Trash2, X } from 'lucide-react'

interface BookingRowActionsProps {
  bookingId: string
  status: string
}

export function BookingRowActions({ bookingId, status }: BookingRowActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const canDelete = status === 'pending' || status === 'cancelled'
  const canCancel = status === 'pending'

  const handleCancel = () => {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('amenity_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
      if (!error) router.refresh()
    })
  }

  const handleDelete = () => {
    if (!window.confirm('Delete this booking? This cannot be undone.')) return
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('amenity_bookings')
        .delete()
        .eq('id', bookingId)
      if (!error) router.refresh()
    })
  }

  if (!canCancel && !canDelete) return null

  return (
    <>
      {canCancel && (
        <DropdownMenuItem
          disabled={isPending}
          onSelect={(e) => {
            e.preventDefault()
            handleCancel()
          }}
          className="text-amber-700"
        >
          <X className="mr-2 size-4" />
          Cancel Booking
        </DropdownMenuItem>
      )}
      {canDelete && (
        <DropdownMenuItem
          disabled={isPending}
          onSelect={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className="text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete Booking
        </DropdownMenuItem>
      )}
    </>
  )
}
