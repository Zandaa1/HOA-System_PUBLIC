
import { createClient } from '@/lib/supabase/server'
import { getBranding } from '@/lib/branding'
import { notFound } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { PrintButton } from '@/components/print-button'

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  const branding = getBranding(settings || [])

  const { data: payment } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:invoices(
        invoice_number, 
        total_amount,
        balance,
        property:properties(block, lot, street_address, homeowners(first_name, last_name))
      ),
      received_by_staff:staff!received_by(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!payment) {
    notFound()
  }

  const invoice = payment.invoice as any
  const property = invoice?.property as any
  const homeowner = property?.homeowners?.[0]

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white text-black min-h-screen border shadow-sm my-8">
      {/* Receipt Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary">{branding.hoaName}</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest">Official Receipt</p>
        <p className="text-sm mt-1">Novaliches, Demo community</p>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div className="text-sm">
          <p><span className="font-bold">Date:</span> {payment.payment_date}</p>
          <p><span className="font-bold">Receipt #:</span> {payment.payment_number}</p>
        </div>
        <div className="text-right text-sm">
          <p><span className="font-bold">Invoice Ref:</span> {invoice?.invoice_number || 'N/A'}</p>
        </div>
      </div>

      <Separator className="my-4 border-black" />

      {/* Content */}
      <div className="space-y-6 py-4">
        <div>
          <p className="text-sm text-gray-500 uppercase font-bold text-[10px]">Received From:</p>
          <p className="text-lg font-bold">
            {homeowner ? `${homeowner.first_name} ${homeowner.last_name}` : 'Resident'}
          </p>
          <p className="text-sm">
            Block {property?.block}, Lot {property?.lot}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 uppercase font-bold text-[10px]">Amount Received:</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">
              ₱{Number(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-sm italic text-gray-600 mt-1">
             Payment via {payment.payment_method?.toUpperCase() || 'N/A'}
             {payment.reference_number && ` (Ref: ${payment.reference_number})`}
          </p>
        </div>

        {invoice && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Account Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Invoice Total:</span>
                <span>₱{Number(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-primary">
                <span>Payment Amount:</span>
                <span>-₱{Number(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold">
                <span>Remaining Balance:</span>
                <span>₱{Number(invoice.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator className="my-8 border-black border-dashed" />

      {/* Signatures */}
      <div className="flex justify-between mt-12">
        <div className="w-48 text-center">
          <div className="border-b border-black h-12 flex items-end justify-center pb-1 font-bold text-sm">
            {payment.received_by_staff 
              ? `${payment.received_by_staff.first_name} ${payment.received_by_staff.last_name}`
              : 'HOA Staff'}
          </div>
          <p className="text-[10px] uppercase font-bold mt-1">Authorized Representative</p>
        </div>
        <div className="w-48 text-center">
          <div className="border-b border-black h-12 flex items-end justify-center pb-1 italic text-xs text-gray-400">
            Payment Validated
          </div>
          <p className="text-[10px] uppercase font-bold mt-1">Status</p>
        </div>
      </div>

      <div className="mt-12 text-center text-[10px] text-gray-400 uppercase tracking-tighter">
        <p>This serves as your official receipt for payment made to {branding.hoaName}.</p>
        <p>Keep this for your records. Thank you!</p>
      </div>

      <PrintButton label="Print Receipt" />
    </div>
  )
}
