'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateResidentCredentials(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const propertyId = formData.get('propertyId') as string
  const residentId = formData.get('residentId') as string
  const residentType = formData.get('residentType') as string

  if (!email || !password || !propertyId) {
    return { error: 'Email, password, and property ID are required.' }
  }

  const supabaseAdmin = await createAdminClient()
  const supabase = await createClient()

  let authUserData: any
  let authError: any

  const { data: createdUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        property_id: propertyId,
        resident_type: residentType,
        resident_id: residentId,
        is_resident: true,
      },
    })

  if (createError) {
    if (createError.message.toLowerCase().includes('already been registered')) {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) return { error: listError.message }

      const existingUser = users.users.find(u => u.email === email)
      if (existingUser) {
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            user_metadata: {
              property_id: propertyId,
              resident_type: residentType,
              resident_id: residentId,
              is_resident: true,
            }
          }
        )
        if (updateError) return { error: updateError.message }
        authUserData = { user: updatedUser.user }
      } else {
        return { error: 'Email already registered but user not found in list.' }
      }
    } else {
      console.error('Supabase Auth Admin Create User Error:', createError)
      return { error: createError.message }
    }
  } else {
    authUserData = createdUser
  }

  const newUserId = authUserData.user?.id

  let linkError: any = null
  if (residentType === 'homeowner') {
    const { error } = await supabase
      .from('homeowners')
      .update({ user_id: newUserId })
      .eq('id', residentId)
    linkError = error
  } else if (residentType === 'renter') {
    const { error } = await supabase
      .from('renters')
      .update({ user_id: newUserId })
      .eq('id', residentId)
    linkError = error
  } else {
    const { data: homeownerUpdate, error: hError } = await supabase
        .from('homeowners')
        .update({ user_id: newUserId })
        .eq('email', email)
        .select()

    const { data: renterUpdate, error: rError } = await supabase
        .from('renters')
        .update({ user_id: newUserId })
        .eq('email', email)
        .select()

    const hUpdated = homeownerUpdate && homeownerUpdate.length > 0
    const rUpdated = renterUpdate && renterUpdate.length > 0

    if (!hUpdated && !rUpdated) {
      linkError = hError || rError || { message: 'No resident profile matches the specified email.' }
    }
  }

  if (linkError) {
    console.error('Supabase Resident Link Error:', linkError)
    await supabaseAdmin.auth.admin.deleteUser(newUserId!)
    return { error: `Failed to link user to resident profile: ${linkError.message}` }
  }

  revalidatePath(`/dashboard/properties/${propertyId}/edit`)
  revalidatePath(`/dashboard/residents/homeowners/${residentId}`)

  return { success: true }
}

export async function resetResidentPassword(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const propertyId = formData.get('propertyId') as string
  const residentId = formData.get('residentId') as string
  const residentType = formData.get('residentType') as string

  if (!email || !password || !residentId) {
    return { error: 'Email, password, and resident ID are required.' }
  }

  const supabaseAdmin = await createAdminClient()

  // 1. Find the user by email to get their ID
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) return { error: listError.message }

  const authUser = users.users.find(u => u.email === email)
  if (!authUser) return { error: 'No account found for this email.' }

  // 2. Update the password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    authUser.id,
    { password }
  )

  if (updateError) {
    console.error('Supabase Auth Admin Update Password Error:', updateError)
    return { error: updateError.message }
  }

  // Revalidate relevant paths
  if (propertyId) revalidatePath(`/dashboard/properties/${propertyId}/edit`)
  if (residentId) {
    revalidatePath(`/dashboard/residents/homeowners/${residentId}`)
  }
  
  return { success: true }
}
