'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { render } from '@react-email/components'
import CredentialWelcome from '@/emails/credential-welcome'
import InvoiceIssued from '@/emails/invoice-issued'
import PaymentReceipt from '@/emails/payment-receipt'
import StickerExpiration from '@/emails/sticker-expiration'
import PenaltyApplied from '@/emails/penalty-applied'
import BookingConfirmed from '@/emails/booking-confirmed'
import { sendEmail } from '@/lib/email'
import { getBranding } from '@/lib/branding'

export async function setMasterAccount(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('system_settings')
    .upsert(
      { setting_key: 'client_master_account_id', setting_value: userId, setting_type: 'string' },
      { onConflict: 'setting_key' }
    )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/developer')
  return { success: true }
}

export async function sendTestEmailAction(type: string, recipient: string) {
  if (!recipient) {
    throw new Error('Recipient email is required.')
  }

  const supabase = await createClient()

  // Fetch settings for branding
  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')

  const branding = getBranding(settings || [])
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  let subject = ''
  let htmlContent = ''

  if (type === 'credential-welcome') {
    subject = `Welcome to ${branding.hoaName} — Your Portal Access Credentials`
    htmlContent = await render(
      CredentialWelcome({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: 'Demo',
        lastName: 'Resident',
        propertyAddress: `Block 3 Lot 14, ${branding.hoaFullName}`,
        email: recipient,
        tempPassword: 'MockTempPassword123!',
        portalUrl: `${portalUrl}/portal`,
      })
    )
  } else if (type === 'invoice-issued') {
    subject = `New Invoice INV-2026-0891 Issued - ${branding.hoaName}`
    htmlContent = await render(
      InvoiceIssued({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: 'Demo',
        lastName: 'Resident',
        propertyAddress: `Block 3 Lot 14, ${branding.hoaFullName}`,
        invoiceNumber: 'INV-2026-0891',
        billingPeriod: 'May 2026',
        dueDate: '15 May 2026',
        amountDue: '₱600.00',
        portalUrl: `${portalUrl}/portal`,
      })
    )
  } else if (type === 'payment-receipt') {
    subject = `Official Receipt OR-2026-0512 - ${branding.hoaName}`
    htmlContent = await render(
      PaymentReceipt({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: 'Demo',
        lastName: 'Resident',
        receiptNumber: 'OR-2026-0512',
        invoiceNumber: 'INV-2026-0891',
        paymentMethod: 'GCash',
        transactionId: 'G-9817293817',
        amountPaid: '₱600.00',
        remainingBalance: '₱0.00',
        portalUrl: `${portalUrl}/portal`,
      })
    )
  } else if (type === 'sticker-expiration') {
    subject = `URGENT: Vehicle Gate Sticker Expiring Soon - ${branding.hoaName}`
    htmlContent = await render(
      StickerExpiration({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: 'Demo',
        lastName: 'Resident',
        vehicleModel: 'Toyota Vios (Black)',
        plateNumber: 'ABC-1234',
        stickerNumber: 'ST-2025-098',
        expirationDate: '31 May 2026 (in 6 days)',
        renewalFee: '₱150.00',
        portalUrl: `${portalUrl}/portal`,
      })
    )
  } else if (type === 'penalty-applied') {
    subject = `OVERDUE NOTICE: Late Payment Penalty Applied - ${branding.hoaName}`
    htmlContent = await render(
      PenaltyApplied({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: 'Demo',
        lastName: 'Resident',
        propertyAddress: `Block 3 Lot 14, ${branding.hoaFullName}`,
        invoiceNumber: 'INV-2026-0891',
        originalBalance: '₱600.00',
        penaltyAmount: '₱12.00',
        newTotalBalance: '₱612.00',
        portalUrl: `${portalUrl}/portal`,
      })
    )
  } else if (type === 'booking-confirmed') {
    subject = `Amenity Booking Confirmed: Clubhouse Reservation - ${branding.hoaName}`
    htmlContent = await render(
      BookingConfirmed({
        hoaName: branding.hoaName,
        hoaLogoUrl: branding.hoaLogoUrl,
        hoaAddress: branding.hoaAddress,
        hoaWebsite: branding.hoaWebsite,
        hoaHelpdeskEmail: branding.hoaHelpdeskEmail,
        firstName: 'Demo',
        lastName: 'Resident',
        amenityName: 'Community Clubhouse (Hall A)',
        reservationDate: 'Saturday, 30 May 2026',
        timeSlot: '1:00 PM - 5:00 PM (4 hours)',
        amountCharged: '₱1,500.00 (Invoiced)',
        portalUrl: `${portalUrl}/portal`,
      })
    )
  } else {
    throw new Error('Invalid email type requested.')
  }

  await sendEmail({
    to: recipient,
    subject,
    html: htmlContent,
  })

  return { success: true }
}

export async function getMapBoundary(): Promise<number[][][] | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('map_boundaries')
    .select('geometry')
    .eq('name', 'default')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return data?.geometry || null
}

export async function saveMapBoundary(geometry: number[][][]): Promise<{ success: boolean }> {
  const supabase = await createClient()

  // Verify caller is developer
  const { data: staffMember } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  const { data: devSetting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'developer_staff_id')
    .single()

  if (!staffMember || !devSetting || staffMember.id !== devSetting.setting_value) {
    throw new Error('Unauthorized: only the developer account can modify map boundaries')
  }

  // Delete existing default boundary
  await supabase.from('map_boundaries').delete().eq('name', 'default')

  // Insert new
  const { error } = await supabase
    .from('map_boundaries')
    .insert({ name: 'default', geometry })

  if (error) throw new Error(error.message)

  revalidatePath('/developer')
  return { success: true }
}
