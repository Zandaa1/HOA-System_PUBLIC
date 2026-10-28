
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

export default async function FeeTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: feeType }, { count: invoiceItemCount }] = await Promise.all([
    supabase.from('fee_types').select('*').eq('id', id).single(),
    supabase.from('invoice_items').select('*', { count: 'exact', head: true }).eq('fee_type_id', id),
  ])

  if (!feeType) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/billing/fee-types">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{feeType.name}</h1>
            <p className="text-sm text-muted-foreground">Fee type profile</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/dashboard/billing/fee-types/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit Fee Type
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Default Amount</span>
            <span>₱{Number(feeType.default_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Recurrence</span>
            <Badge variant={feeType.recurrence === 'one_time' ? 'outline' : 'secondary'}>
              {feeType.recurrence === 'monthly' ? 'Monthly' : feeType.recurrence === 'yearly' ? 'Yearly' : 'One-time'}
            </Badge>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={feeType.is_active ? 'secondary' : 'outline'}>
              {feeType.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Used on Invoice Items</span>
            <span>{invoiceItemCount || 0}</span>
          </div>
          {feeType.description && (
            <div className="pt-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Description</p>
              <p>{feeType.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
