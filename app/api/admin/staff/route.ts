import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveStaffPermissions } from '@/lib/modules'

// Use service role key to bypass RLS and use admin auth methods
const supabaseAdmin = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller
    const supabase = await createClient()
    const { data: { user: callerUser }, error: callerAuthError } = await supabase.auth.getUser()
    
    if (callerAuthError || !callerUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch caller staff details
    const { data: callerStaff, error: callerStaffError } = await supabase
      .from('staff')
      .select('id, is_active, permissions')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    if (callerStaffError || !callerStaff || !callerStaff.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Resolve permissions of the caller
    const effectivePerms = resolveStaffPermissions(callerStaff.permissions)

    if (!effectivePerms.all && !effectivePerms.modules.includes('staff_access')) {
      return NextResponse.json(
        { error: 'Forbidden: Staff & Access permissions required.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const { email, first_name, last_name, employee_id, position, phone, password, permissions } = body

    // 1. Create user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name, last_name },
      email_confirm: true,
    })

    if (authError) {
      throw authError
    }

    // 2. Create staff record linked to the new auth user
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        user_id: authData.user.id,
        employee_id,
        first_name,
        last_name,
        email,
        position,
        phone,
        permissions: permissions || {},
        is_active: true,
      })

    if (staffError) {
      // Cleanup: delete the auth user if staff record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw staffError
    }

    // 3. Fetch the staff ID
    const { data: staffRecord } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('user_id', authData.user.id)
      .single()

    return NextResponse.json({ success: true, user: authData.user, staff_id: staffRecord?.id })
  } catch (error: any) {
    console.error('Staff creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create staff member' },
      { status: 400 }
    )
  }
}
