import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Verify staff access (optional but recommended at API level)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use Promise.all for parallel fetching
  const [summaryResponse, feeResponse, arrearsResponse] = await Promise.all([
    supabase.from('financial_summary_by_period').select('*'),
    supabase.from('revenue_by_fee_type').select('*'),
    supabase.from('property_arrears_summary').select('*').limit(10)
  ])

  if (summaryResponse.error || feeResponse.error || arrearsResponse.error) {
    console.error('Report API Error:', {
      summary: summaryResponse.error,
      fee: feeResponse.error,
      arrears: arrearsResponse.error
    })
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    summary: summaryResponse.data,
    revenueByFeeType: feeResponse.data,
    topArrears: arrearsResponse.data
  })
}
