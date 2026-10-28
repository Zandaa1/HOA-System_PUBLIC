'use server'

import { createClient } from '@/lib/supabase/server'
import { render } from '@react-email/components'
import CredentialWelcome from '@/emails/credential-welcome'
import { sendEmail } from '@/lib/email'
import { getBranding } from '@/lib/branding'

export async function sendCredentialEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const residentId = formData.get('residentId') as string
  const residentType = formData.get('residentType') as string
  const propertyId = formData.get('propertyId') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string

  if (!email || !password || !residentId) {
    return { error: 'Email, password, and resident ID are required.' }
  }

  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')

  const branding = getBranding(settings || [])
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || ''

  let propertyAddress = ''
  if (propertyId) {
    const { data: property } = await supabase
      .from('properties')
      .select('block, lot')
      .eq('id', propertyId)
      .single()
    if (property) {
      propertyAddress = `Block ${property.block} Lot ${property.lot}, ${branding.hoaFullName}`
    }
  }

  try {
    const emailHtml = await render(
      CredentialWelcome({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: firstName || 'Resident',
        lastName: lastName || '',
        propertyAddress,
        email,
        tempPassword: password,
        portalUrl: portalUrl ? `${portalUrl}/portal` : '',
      })
    )

    await sendEmail({
      to: email,
      subject: `Welcome to ${branding.hoaName} — Your Portal Access Credentials`,
      html: emailHtml,
    })

    return { success: true, emailSent: true }
  } catch (err) {
    console.error('Failed to send credential email:', err)
    return { error: 'Failed to send email. Check SMTP configuration.' }
  }
}
