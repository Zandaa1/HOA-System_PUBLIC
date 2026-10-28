import { SupabaseClient } from '@supabase/supabase-js'
import { Property } from '@/lib/types/database'
import { cache } from 'react'

export interface ResidentSession {
  resident_id: string
  property_id: string
  resident_type: 'homeowner' | 'renter'
  first_name: string
  last_name: string
  block: string
  lot: string
  property?: Property
}

export const getResidentSession = cache(async (supabase: SupabaseClient): Promise<ResidentSession | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check if they are a homeowner
  const { data: homeowner } = await supabase
    .from('homeowners')
    .select('id, property_id, first_name, last_name, property:properties(block, lot)')
    .eq('user_id', user.id)
    .single()

  if (homeowner && homeowner.property) {
    // Return early if homeowner is found
    const prop = Array.isArray(homeowner.property) ? homeowner.property[0] : homeowner.property;
    return {
      resident_id: homeowner.id,
      property_id: homeowner.property_id,
      resident_type: 'homeowner',
      first_name: homeowner.first_name,
      last_name: homeowner.last_name,
      block: prop?.block || '',
      lot: prop?.lot || '',
    }
  }

  // Check if they are a renter
  const { data: renter } = await supabase
    .from('renters')
    .select('id, property_id, first_name, last_name, property:properties(block, lot)')
    .eq('user_id', user.id)
    .single()

  if (renter && renter.property) {
    const prop = Array.isArray(renter.property) ? renter.property[0] : renter.property;
    return {
      resident_id: renter.id,
      property_id: renter.property_id,
      resident_type: 'renter',
      first_name: renter.first_name,
      last_name: renter.last_name,
      block: prop?.block || '',
      lot: prop?.lot || '',
    }
  }

  return null
})
