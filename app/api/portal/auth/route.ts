import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { block, lot, lastName } = await request.json()

    if (!block || !lot || !lastName) {
      return NextResponse.json(
        { error: 'Block, lot, and last name are required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Call the custom RPC
    const { data, error } = await supabase.rpc('authenticate_resident', {
      p_block: block,
      p_lot: lot,
      p_last_name: lastName
    })

    if (error) {
      console.error('Auth RPC Error:', error)
      return NextResponse.json(
        { error: 'Authentication failed due to server error' },
        { status: 500 }
      )
    }

    if (data && data.success) {
      // 1. Create a custom session payload
      const residentSession = {
        resident_id: data.resident_id,
        property_id: data.property_id,
        resident_type: data.resident_type,
        first_name: data.first_name,
        last_name: data.last_name,
        block: data.block,
        lot: data.lot
      }

      // 2. We can't generate a true Supabase Auth session from just this info without a password/email.
      // So we use a signed custom cookie for the portal.
      // Note: This means standard Supabase RLS based on auth.uid() won't work automatically for portal users 
      // unless we link them to a real auth user or use custom JWTs. 
      // For this implementation, we will rely on server-side checks using this cookie for portal routes.
      
      const cookieStore = await cookies()
      cookieStore.set('resident_session', JSON.stringify(residentSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })

      return NextResponse.json({ success: true, user: residentSession })
    } else {
      return NextResponse.json(
        { error: data?.error || 'Invalid credentials' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Login Route Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('resident_session')
  return NextResponse.json({ success: true })
}
