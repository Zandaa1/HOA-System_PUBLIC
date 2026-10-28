
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { CreditCard, FileText, Printer } from 'lucide-react'
import { ApplyDiscountForm } from './apply-discount'
import { ApplyPenaltyForm } from './apply-penalty'
import { INVOICE_STATUS_COLORS } from '@/lib/constants'

const statusColors: Record<string, string> = INVOICE_STATUS_COLORS

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      property:properties(id, block, lot, street_address, homeowners(first_name, last_name)),
      billing_period:billing_periods(name),
      invoice_items(*),
      payments(*)
    `)
    .eq('id', id)
    .single()

  if (!invoice) {
    notFound()
  }

  const property = invoice.property as {
    id: string
    block: string
    lot: string
    street_address: string | null
    homeowners: { first_name: string; last_name: string }[]
  } | null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/billing/invoices" className="hover:text-primary transition-colors">
              Invoices
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{invoice.invoice_number}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {invoice.invoice_number}
            </h1>
            <Badge className={statusColors[invoice.status]} variant="secondary">
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {property
              ? `Block ${property.block}, Lot ${property.lot}`
              : 'No property'}
            {invoice.billing_period?.name && ` • ${invoice.billing_period.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button asChild size="sm">
              <Link href={`/dashboard/billing/payments/new?invoice_id=${id}`}>
                <CreditCard className="mr-2 size-4" />
                Record Payment
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/billing/invoices/${id}/print`}>
              <Printer className="mr-2 size-4" />
              Print
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Number</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date</span>
              <span>{invoice.issue_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{invoice.due_date}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                ₱{Number(invoice.subtotal).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>
                  -₱{Number(invoice.discount_amount).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {Number(invoice.penalty_amount) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Penalties</span>
                <span>
                  +₱{Number(invoice.penalty_amount).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total Amount</span>
              <span>
                ₱{Number(invoice.total_amount).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="text-green-600">
                ₱{Number(invoice.amount_paid).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between font-medium text-lg">
              <span>Balance Due</span>
              <span className={Number(invoice.balance) > 0 ? 'text-red-600' : ''}>
                ₱{Number(invoice.balance).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {property && (
              <>
                <p className="font-medium">
                  Block {property.block}, Lot {property.lot}
                </p>
                {property.street_address && (
                  <p className="text-muted-foreground">{property.street_address}</p>
                )}
                {property.homeowners?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">Homeowner:</p>
                    <p className="font-medium">
                      {property.homeowners[0].first_name} {property.homeowners[0].last_name}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_items?.map((item: { id: string; description: string; quantity: number; unit_price: number; amount: number }) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      ₱{Number(item.unit_price).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      ₱{Number(item.amount).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>Payments received for this invoice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoice.payments.map((payment: { id: string; payment_number: string; amount: number; payment_date: string; payment_method: string | null }) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{payment.payment_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.payment_date} • {payment.payment_method || 'N/A'}
                    </p>
                  </div>
                  <span className="font-medium text-green-600">
                    ₱{Number(payment.amount).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Adjustments — discount and penalty tools, only on open invoices */}
      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Adjustments</CardTitle>
            <CardDescription>Apply a discount or late fee to this invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ApplyDiscountForm invoiceId={id} subtotal={Number(invoice.subtotal)} />
            <Separator />
            <ApplyPenaltyForm invoiceId={id} balance={Number(invoice.balance)} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
