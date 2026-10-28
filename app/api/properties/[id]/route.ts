import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: propertyId } = await params

  const [{ data: homeowners }, { data: renters }, { data: vehicles }] = await Promise.all([
    supabase
      .from('homeowners')
      .select('id, first_name, last_name, email, phone, is_residing')
      .eq('property_id', propertyId),
    supabase
      .from('renters')
      .select('id, first_name, last_name, email, phone, is_active')
      .eq('property_id', propertyId),
    supabase
      .from('vehicles')
      .select('id, plate_number, brand, model, color, is_active')
      .eq('property_id', propertyId),
  ])

  return NextResponse.json({
    homeowners: homeowners || [],
    renters: renters || [],
    vehicles: vehicles || [],
  })
}
