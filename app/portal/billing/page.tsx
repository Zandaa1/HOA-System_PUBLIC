
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Invoice } from '@/lib/types/database'
import { INVOICE_STATUS_COLORS } from '@/lib/constants'
import Link from 'next/link'

export default async function PortalBillingPage() {
  const supabase = await createClient()
  const residentSession = await getResidentSession(supabase)

  if (!residentSession) {
    redirect('/auth/login')
  }

  // Fetch invoices for the property
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      billing_period:billing_periods(name)
    `)
    .eq('property_id', residentSession.property_id)
    .order('issue_date', { ascending: false })

  const getStatusColor = (status: string) => {
    return INVOICE_STATUS_COLORS[status] || INVOICE_STATUS_COLORS.cancelled
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing History</h1>
          <p className="text-muted-foreground">
            View your past invoices and payment status.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>All invoices issued for Block {residentSession.block} Lot {residentSession.lot}.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/portal/billing/invoices/${invoice.id}`} 
                        className="font-mono text-primary hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.billing_period?.name || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(invoice.issue_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      ₱{invoice.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₱{invoice.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)} variant="outline">
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground italic">No invoices found for this property.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
