
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

export default async function NonInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('non_invoice_collections')
    .select('*, bank_account:bank_accounts(*)')
    .eq('id', id)
    .single()

  if (!item) notFound()

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
          <Link href={`/dashboard/billing/collections/non-invoice/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Receipt Number</dt><dd className="font-medium">{item.receipt_number || '-'}</dd></div>
            <div><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{item.category}</dd></div>
            <div><dt className="text-muted-foreground">Amount</dt><dd className="font-medium text-green-600">₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</dd></div>
            <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{item.payment_date}</dd></div>
            <div><dt className="text-muted-foreground">Payment Method</dt><dd className="font-medium">{item.payment_method}</dd></div>
            <div><dt className="text-muted-foreground">Account</dt><dd className="font-medium">{item.bank_account?.name || '-'}</dd></div>
            {item.notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd className="font-medium">{item.notes}</dd></div>}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
