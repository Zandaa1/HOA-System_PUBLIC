
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft, Printer, Receipt, HelpCircle } from 'lucide-react'

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Verify resident session
  const residentSession = await getResidentSession(supabase)
  if (!residentSession) {
    redirect('/auth/login')
  }

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

  // Fetch settings for treasurer contact
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
  const settingsMap = (settings || []).reduce(
    (acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }),
    {} as Record<string, string>
  )

  return (
    <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 pb-12">
      {/* Header / Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2.5 h-8 font-medium">
            <Link href="/portal/billing" className="flex items-center gap-1">
              <ArrowLeft className="size-4" /> Back to Billing
            </Link>
          </Button>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {invoice.invoice_number}
            </h1>
            <StatusBadge type="invoice" status={invoice.status} className="font-semibold" />
          </div>
          <p className="text-sm text-muted-foreground">
            {property ? `Block ${property.block}, Lot ${property.lot}` : 'No property'}
            {invoice.billing_period?.name && ` • ${invoice.billing_period.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="h-9">
            <Link href={`/portal/billing/invoices/${id}/print`} target="_blank" className="flex items-center gap-1">
              <Printer className="size-4" />
              Print Invoice / SOA
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid details */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side Cards - Spans 2 */}
        <div className="space-y-6 md:col-span-2">
          {/* Invoice Items */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base font-semibold">Statement Items</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right w-20">Qty</th>
                      <th className="px-4 py-3 text-right w-32">Unit Price</th>
                      <th className="px-4 py-3 text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.invoice_items?.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/55">
                        <td className="px-4 py-3.5 font-medium text-slate-800">{item.description}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs">{item.quantity}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs">
                          ₱{Number(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900 font-mono text-xs">
                          ₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 ? (
            <Card className="border-muted/60 shadow-sm">
              <CardHeader className="pb-4 pt-5 px-6">
                <CardTitle className="text-base font-semibold">Payments Received</CardTitle>
                <CardDescription className="text-xs">Transaction receipts credited to this invoice</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0 space-y-3">
                {invoice.payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-4 bg-slate-50/30"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-800">{payment.payment_number}</span>
                        {payment.reference_number && (
                          <Badge variant="secondary" className="font-mono text-[10px] py-0">Ref: {payment.reference_number}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_date} • <span className="capitalize">{payment.payment_method || 'N/A'}</span>
                      </p>
                    </div>
                    <span className="font-bold text-emerald-600 font-mono text-sm">
                      ₱{Number(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm bg-slate-50/30">
              <Receipt className="size-8 mx-auto text-muted-foreground/60 mb-2" />
              No payments recorded yet for this statement.
            </div>
          )}
        </div>

        {/* Right Side Cards - Spans 1 */}
        <div className="space-y-6 md:col-span-1">
          {/* Invoice Summary */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base font-semibold">Statement Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date</span>
                <span>{invoice.issue_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium text-slate-800">{invoice.due_date}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono text-xs">
                  ₱{Number(invoice.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount Applied</span>
                  <span className="font-mono text-xs">
                    -₱{Number(invoice.discount_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {Number(invoice.penalty_amount) > 0 && (
                <div className="flex justify-between text-rose-700 font-medium">
                  <span>Penalties Added</span>
                  <span className="font-mono text-xs">
                    +₱{Number(invoice.penalty_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="font-mono text-xs">
                  ₱{Number(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Payments</span>
                <span className="text-emerald-700 font-medium font-mono text-xs">
                  ₱{Number(invoice.amount_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-lg pt-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                <span>Balance Due</span>
                <span className={`font-mono text-sm ${Number(invoice.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₱{Number(invoice.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Bill To */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base font-semibold">Billing Details</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 space-y-2 text-sm leading-relaxed">
              {property && (
                <>
                  <p className="font-semibold text-slate-800">
                    Block {property.block}, Lot {property.lot}
                  </p>
                  {property.street_address && (
                    <p className="text-muted-foreground">{property.street_address}</p>
                  )}
                  {property.homeowners?.length > 0 && (
                    <div className="mt-3 bg-slate-50/50 p-2.5 rounded border border-slate-100 text-xs">
                      <p className="text-muted-foreground font-semibold">Registered Owner:</p>
                      <p className="font-bold text-slate-700 mt-0.5">
                        {property.homeowners[0].first_name} {property.homeowners[0].last_name}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Invoice Note */}
          {invoice.notes && (
            <Card className="border-muted/60 shadow-sm bg-slate-50/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-0 text-xs whitespace-pre-wrap leading-relaxed text-slate-600">
                {invoice.notes}
              </CardContent>
            </Card>
          )}

          {/* Treasurer Support */}
          <Card className="border-muted/60 border-l-4 border-l-primary shadow-sm bg-primary/5">
            <CardContent className="p-4 text-xs leading-relaxed text-slate-700">
              <p className="font-bold text-primary flex items-center gap-1.5 mb-1 text-xs">
                <HelpCircle className="size-3.5" /> Billing Support:
              </p>
              For discrepancies or questions about late fees/penalties, contact the HOA Treasury office at **{settingsMap['contact_phone'] || 'N/A'}** or email **{settingsMap['contact_email'] || 'N/A'}**.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
