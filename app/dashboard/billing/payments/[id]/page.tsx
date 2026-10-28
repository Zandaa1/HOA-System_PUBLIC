
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft, Printer, Pencil } from 'lucide-react'
import { getOptimizedStorageUrl } from '@/lib/utils'

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  other: 'Other',
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: payment } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:invoices(
        invoice_number, 
        property:properties(block, lot, homeowners(first_name, last_name))
      ),
      received_by_staff:staff!received_by(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!payment) {
    notFound()
  }

  const invoice = payment.invoice as any
  const homeowner = invoice?.property?.homeowners?.[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/billing/payments">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Payment Details</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/billing/payments/${id}/edit`}>
              <Pencil className="mr-2 size-4" />
              Edit Payment
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/billing/payments/${id}/receipt`}>
              <Printer className="mr-2 size-4" />
              Print Receipt
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Payment Number</span>
                <span className="font-medium">{payment.payment_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span>{payment.payment_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Method</span>
                <Badge variant="secondary">
                  {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reference #</span>
                <span>{payment.reference_number || 'N/A'}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Paid</span>
                <span className="text-2xl font-bold text-green-600">
                  ₱{Number(payment.amount).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {payment.received_by_staff && (
                <div className="pt-2 text-xs text-muted-foreground text-right italic">
                  Received by: {payment.received_by_staff.first_name} {payment.received_by_staff.last_name}
                </div>
              )}
            </CardContent>
          </Card>

          {payment.attachment_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proof of Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                  <img 
                    src={getOptimizedStorageUrl(payment.attachment_url, { width: 600 })}
                    alt="Proof of Payment"
                    className="max-w-full h-auto shadow-sm"
                  />
                </div>
                <div className="mt-2 text-center">
                   <Button variant="link" size="sm" asChild>
                     <a 
                       href={getOptimizedStorageUrl(payment.attachment_url)}
                       target="_blank"
                       rel="noopener noreferrer"
                     >
                       View Full Size
                     </a>
                   </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice Linked</span>
              {invoice ? (
                <Link 
                  href={`/dashboard/billing/invoices/${payment.invoice_id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {invoice.invoice_number}
                </Link>
              ) : (
                <span>No Invoice Linked</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payer Name</span>
              <span className="font-medium">
                {homeowner ? `${homeowner.first_name} ${homeowner.last_name}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Property</span>
              <span>
                {invoice?.property ? `Block ${invoice.property.block}, Lot ${invoice.property.lot}` : 'N/A'}
              </span>
            </div>
            {payment.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">Notes</span>
                  <p className="mt-1 text-sm">{payment.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
