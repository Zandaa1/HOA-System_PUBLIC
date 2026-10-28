'use server'

import { createClient } from '@/lib/supabase/server'
import { render } from '@react-email/components'
import WaterLeakWarning from '@/emails/water-leak-warning'
import { sendEmail } from '@/lib/email'
import { getBranding } from '@/lib/branding'

export async function sendLeakWarningEmail(
  meterId: string,
  readingDate: string,
  consumption: number,
  averageConsumption: number,
  percentIncrease: number
) {
  if (!meterId) {
    return { error: 'Meter ID is required.' }
  }

  const supabase = await createClient()

  // 1. Fetch meter and property details
  const { data: meter } = await supabase
    .from('water_meters')
    .select('meter_number, property_id, property:properties(block, lot)')
    .eq('id', meterId)
    .single()

  if (!meter) {
    return { error: 'Water meter not found.' }
  }

  const propertyId = meter.property_id
  const prop = Array.isArray(meter.property) ? meter.property[0] : meter.property
  const propertyAddress = prop
    ? `Block ${prop.block} Lot ${prop.lot}`
    : ''

  // 2. Fetch homeowner details
  const { data: homeowner } = await supabase
    .from('homeowners')
    .select('first_name, last_name, email')
    .eq('property_id', propertyId)
    .eq('is_active', true)
    .maybeSingle()

  if (!homeowner || !homeowner.email) {
    return { error: 'Homeowner email not found for this property.' }
  }

  // 3. Fetch branding settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')

  const branding = getBranding(settings || [])
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || ''

  try {
    const emailHtml = await render(
      WaterLeakWarning({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: homeowner.first_name || 'Resident',
        lastName: homeowner.last_name || '',
        propertyAddress: `${propertyAddress}, ${branding.hoaFullName}`,
        meterNumber: meter.meter_number,
        readingDate,
        consumption: consumption.toFixed(2),
        averageConsumption: averageConsumption.toFixed(2),
        percentIncrease: percentIncrease.toFixed(0),
        portalUrl: portalUrl ? `${portalUrl}/portal` : '',
      })
    )

    await sendEmail({
      to: homeowner.email,
      subject: `🚨 Water Consumption Alert: Possible Leak at ${propertyAddress}`,
      html: emailHtml,
    })

    return { success: true, emailSent: true }
  } catch (err) {
    console.error('Failed to send leak warning email:', err)
    return { error: 'Failed to send email. Check SMTP configuration.' }
  }
}
