'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPermitAction(formData: {
  property_id: string
  applicant_name: string
  permit_type: 'renovation' | 'new_construction' | 'demolition' | 'other'
  description?: string
  start_date: string
  estimated_end_date: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('construction_permits')
    .insert({
      property_id: formData.property_id,
      applicant_name: formData.applicant_name,
      permit_type: formData.permit_type,
      description: formData.description || null,
      start_date: formData.start_date,
      estimated_end_date: formData.estimated_end_date,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/permits')
  revalidatePath('/portal/permits')
  return { success: true, data }
}

export async function approvePermitAction(
  permitId: string,
  permitFee: number,
  bondAmount: number
) {
  const supabase = await createClient()

  // 1. Fetch permit and property details
  const { data: permit, error: fetchErr } = await supabase
    .from('construction_permits')
    .select('*, property:properties(block, lot)')
    .eq('id', permitId)
    .single()

  if (fetchErr || !permit) {
    throw new Error('Construction permit not found.')
  }

  const prop = Array.isArray(permit.property) ? permit.property[0] : (permit.property as any)
  const block = prop?.block || 'X'
  const lot = prop?.lot || 'Y'
  const invoiceNumber = `INV-PERMIT-B${block}L${lot}-${Date.now().toString().slice(-4)}`

  // 2. Determine issue date (today) and due date (today + 15 days)
  const today = new Date()
  const issueDateStr = today.toISOString().slice(0, 10)
  const dueDate = new Date()
  dueDate.setDate(today.getDate() + 15)
  const dueDateStr = dueDate.toISOString().slice(0, 10)

  const total = permitFee + bondAmount

  // 3. Create the Invoice
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      property_id: permit.property_id,
      issue_date: issueDateStr,
      due_date: dueDateStr,
      subtotal: total,
      total_amount: total,
      balance: total,
      status: 'pending',
      notes: `Permit Fee & Refundable Construction Bond for permit ID: ${permitId}`,
    })
    .select('id')
    .single()

  if (invErr) {
    throw new Error(`Failed to create invoice: ${invErr.message}`)
  }

  // 4. Create Invoice Items
  const items = []
  if (permitFee > 0) {
    items.push({
      invoice_id: invoice.id,
      description: `Construction Permit Fee (${permit.permit_type})`,
      quantity: 1,
      unit_price: permitFee,
      amount: permitFee,
    })
  }

  if (bondAmount > 0) {
    items.push({
      invoice_id: invoice.id,
      description: `Refundable Construction Bond`,
      quantity: 1,
      unit_price: bondAmount,
      amount: bondAmount,
    })
  }

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from('invoice_items').insert(items)
    if (itemsErr) {
      throw new Error(`Failed to create invoice items: ${itemsErr.message}`)
    }
  }

  // 5. Update the permit record
  const { error: permitErr } = await supabase
    .from('construction_permits')
    .update({
      status: 'approved',
      permit_fee: permitFee,
      bond_amount: bondAmount,
      permit_invoice_id: invoice.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', permitId)

  if (permitErr) {
    throw new Error(`Failed to update permit: ${permitErr.message}`)
  }

  revalidatePath('/dashboard/permits')
  revalidatePath('/portal/permits')
  return { success: true }
}

export async function rejectPermitAction(permitId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('construction_permits')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', permitId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/permits')
  revalidatePath('/portal/permits')
  return { success: true }
}

export async function completePermitAndRefundAction(
  permitId: string,
  bankAccountId: string,
  paymentMethod: string,
  referenceNumber?: string,
  notes?: string
) {
  const supabase = await createClient()

  // 1. Fetch permit
  const { data: permit, error: fetchErr } = await supabase
    .from('construction_permits')
    .select('*')
    .eq('id', permitId)
    .single()

  if (fetchErr || !permit) {
    throw new Error('Construction permit not found.')
  }

  if (permit.status !== 'approved') {
    throw new Error('Permit must be in Approved status to complete and refund.')
  }

  const refundAmount = Number(permit.bond_amount)

  if (refundAmount > 0) {
    // 2. Generate disbursement number
    const disNo = `DISB-BOND-REFUND-${Date.now().toString().slice(-4)}`
    const now = new Date()

    // 3. Create refund disbursement
    const { error: disbErr } = await supabase
      .from('disbursements')
      .insert({
        disbursement_number: disNo,
        category: 'refund_bond',
        amount: refundAmount,
        payment_date: now.toISOString().slice(0, 10),
        payment_method: paymentMethod,
        bank_account_id: bankAccountId,
        payee: permit.applicant_name,
        notes: notes || `Refund of Construction Bond for Permit ID: ${permitId}`,
        reference_number: referenceNumber || null,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
      })

    if (disbErr) {
      throw new Error(`Failed to create refund disbursement: ${disbErr.message}`)
    }
  }

  // 4. Update permit to completed
  const { error: permitErr } = await supabase
    .from('construction_permits')
    .update({
      status: 'completed',
      bond_refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', permitId)

  if (permitErr) {
    throw new Error(`Failed to complete permit: ${permitErr.message}`)
  }

  revalidatePath('/dashboard/permits')
  revalidatePath('/portal/permits')
  return { success: true }
}

export async function cancelPermitAction(permitId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('construction_permits')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', permitId)
    .eq('status', 'pending') // Only cancel if still pending

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/permits')
  revalidatePath('/portal/permits')
  return { success: true }
}
