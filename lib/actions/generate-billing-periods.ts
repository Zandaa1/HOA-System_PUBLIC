'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateYear() {
  const supabase = await createClient()

  // Determine next month to start from
  const { data: lastPeriod } = await supabase
    .from('billing_periods')
    .select('end_date')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1 // JavaScript months are 0-indexed

  // If last period exists and its end_date is in the future, start after it
  if (lastPeriod?.end_date) {
    const lastEnd = new Date(lastPeriod.end_date)
    if (lastEnd >= now) {
      // Start 1 month after last period's end
      const nextStart = new Date(lastEnd.getFullYear(), lastEnd.getMonth() + 1, 1)
      year = nextStart.getFullYear()
      month = nextStart.getMonth() + 1
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Fetch existing period names to skip duplicates
  const { data: existingPeriods } = await supabase
    .from('billing_periods')
    .select('name')

  const existingNames = new Set(existingPeriods?.map(p => p.name) || [])

  const periodsToInsert: {
    name: string
    start_date: string
    end_date: string
    due_date: string
    is_closed: boolean
  }[] = []

  // Generate from the start month until the end of that calendar year
  const monthsToGenerate = 12 - month + 1

  for (let i = 0; i < monthsToGenerate; i++) {
    const m = ((month + i - 1) % 12) + 1
    const y = year + Math.floor((month + i - 1) / 12)
    const name = `${monthNames[m - 1]} ${y}`

    if (existingNames.has(name)) continue

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const dueDate = `${y}-${String(m).padStart(2, '0')}-15`

    periodsToInsert.push({
      name,
      start_date: startDate,
      end_date: endDate,
      due_date: dueDate,
      is_closed: false,
    })
  }

  if (periodsToInsert.length === 0) {
    return { success: true, count: 0 }
  }

  const { error } = await supabase.from('billing_periods').insert(periodsToInsert)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/billing/periods')
  return { success: true, count: periodsToInsert.length }
}

export async function deleteBillingPeriod(id: string) {
  const supabase = await createClient()

  // 1. Get the billing period name first to check water_bills
  const { data: period, error: fetchError } = await supabase
    .from('billing_periods')
    .select('name')
    .eq('id', id)
    .single()

  if (fetchError || !period) {
    return { success: false, error: 'Billing period not found.' }
  }

  // 2. Check invoices table
  const { count: invoiceCount, error: invErr } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('billing_period_id', id)

  if (invErr) {
    return { success: false, error: 'Error checking invoices.' }
  }

  if (invoiceCount && invoiceCount > 0) {
    return { success: false, error: 'Cannot delete: invoices are generated for this period.' }
  }

  // 3. Check water_bills table by name
  const { count: waterBillCount, error: waterErr } = await supabase
    .from('water_bills')
    .select('*', { count: 'exact', head: true })
    .eq('billing_period', period.name)

  if (waterErr) {
    return { success: false, error: 'Error checking water bills.' }
  }

  if (waterBillCount && waterBillCount > 0) {
    return { success: false, error: 'Cannot delete: water bills exist for this period.' }
  }

  // 4. Delete the period
  const { error: deleteErr } = await supabase
    .from('billing_periods')
    .delete()
    .eq('id', id)

  if (deleteErr) {
    return { success: false, error: deleteErr.message }
  }

  revalidatePath('/dashboard/billing/periods')
  return { success: true }
}

