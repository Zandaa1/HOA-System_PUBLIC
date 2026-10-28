import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Allowed tables for export — whitelist to prevent arbitrary data access
const ALLOWED_TABLES = [
  'properties', 'homeowners', 'renters', 'vehicles',
  'invoices', 'invoice_items', 'payments', 'penalties', 'discounts',
  'non_invoice_collections', 'disbursements', 'bank_accounts', 'bank_balances', 'account_transfers',
  'advance_deposits', 'amenities', 'amenity_bookings',
  'billing_periods', 'fee_types', 'staff', 'audit_logs', 'property_transfers',
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

function objectsToCsv(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return ''
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
      // Escape quotes and wrap in quotes if contains comma/newline
      const escaped = str.replace(/"/g, '""')
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
        ? `"${escaped}"`
        : escaped
    }).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params

  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    return NextResponse.json({ error: 'Table not allowed for export.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from(table as AllowedTable)
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const csv = objectsToCsv(data as Record<string, unknown>[])
  const filename = `hoa_demo_${table}_${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
