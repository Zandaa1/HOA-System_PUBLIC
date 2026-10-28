
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

export default async function AdvanceDepositDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('advance_deposits')
    .select('*, property:properties(block, lot)')
    .eq('id', id)
    .single()

  if (!item) notFound()

  const propertyStr = item.property ? `Block ${item.property.block}, Lot ${item.property.lot}` : '-'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/billing/collections">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/billing/collections/advance-deposits/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advance Deposit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Property</dt><dd className="font-medium">{propertyStr}</dd></div>
            <div><dt className="text-muted-foreground">Amount</dt><dd className="font-medium text-green-600">₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</dd></div>
            <div><dt className="text-muted-foreground">Deposit Date</dt><dd className="font-medium">{item.deposit_date}</dd></div>
            <div><dt className="text-muted-foreground">Remaining Balance</dt><dd className="font-medium">₱{Number(item.remaining_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</dd></div>
            <div><dt className="text-muted-foreground">Payment Method</dt><dd className="font-medium">{item.payment_method || '-'}</dd></div>
            <div><dt className="text-muted-foreground">Reference</dt><dd className="font-medium">{item.reference_number || '-'}</dd></div>
            {item.notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd className="font-medium">{item.notes}</dd></div>}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
