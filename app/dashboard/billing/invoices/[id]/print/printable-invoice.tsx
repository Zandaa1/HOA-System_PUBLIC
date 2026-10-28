'use client'

import { Separator } from '@/components/ui/separator'
import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getBranding, DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface PrintableInvoiceProps {
  invoice: {
    invoice_number: string
    issue_date: string
    due_date: string
    status: string
    subtotal: number
    discount_amount: number
    penalty_amount: number
    total_amount: number
    amount_paid: number
    balance: number
    billing_period?: { name: string } | null
    invoice_items?: InvoiceItem[]
  }
  property: {
    block: string
    lot: string
    street_address: string | null
    homeowners: { first_name: string; last_name: string }[]
  } | null
  autoPrint?: boolean
}

export function PrintableInvoice({ invoice, property, autoPrint }: PrintableInvoiceProps) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)

  useEffect(() => {
    async function loadBranding() {
      const supabase = createClient()
      const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
      if (settings) setBranding(getBranding(settings))
    }
    loadBranding()
  }, [])

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => window.print(), 500)
      return () => clearTimeout(timer)
    }
  }, [autoPrint])

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen">
      {/* Print button — hidden when actually printing */}
      <div className="fixed bottom-8 right-8 print:hidden z-50">
        <button
          onClick={() => window.print()}
          className="bg-primary text-white px-6 py-3 rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 font-bold"
        >
          <Printer className="size-5" />
          Print Invoice
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">{branding.hoaName}</h1>
          <p className="text-sm text-gray-600">{branding.hoaFullName}, Novaliches, Quezon City</p>
          <p className="text-sm text-gray-600">Tel: (02) XXXX-XXXX | Email: {branding.hoaHelpdeskEmail}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Statement of Account</h2>
          <p className="text-lg font-semibold">{invoice.invoice_number}</p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Bill To & Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Bill To:</h3>
          <div className="text-sm space-y-1">
            {property && (
              <>
                <p className="font-bold text-lg">
                  {property.homeowners?.[0]
                    ? `${property.homeowners[0].first_name} ${property.homeowners[0].last_name}`
                    : 'Resident'}
                </p>
                <p>Block {property.block}, Lot {property.lot}</p>
                {property.street_address && <p>{property.street_address}</p>}
                <p>{branding.hoaFullName}, Novaliches, Quezon City</p>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="inline-grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-gray-500 uppercase">Issue Date:</span>
            <span>{invoice.issue_date}</span>
            <span className="font-bold text-gray-500 uppercase">Due Date:</span>
            <span className="font-bold">{invoice.due_date}</span>
            <span className="font-bold text-gray-500 uppercase">Billing Period:</span>
            <span>{invoice.billing_period?.name || 'N/A'}</span>
            <span className="font-bold text-gray-500 uppercase">Status:</span>
            <span className="uppercase font-bold">{invoice.status}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="border-b-2 border-black bg-gray-50">
            <th className="py-3 px-4 text-left font-bold uppercase text-sm">Description</th>
            <th className="py-3 px-4 text-center font-bold uppercase text-sm w-20">Qty</th>
            <th className="py-3 px-4 text-right font-bold uppercase text-sm w-32">Unit Price</th>
            <th className="py-3 px-4 text-right font-bold uppercase text-sm w-32">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.invoice_items?.map((item) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-3 px-4">{item.description}</td>
              <td className="py-3 px-4 text-center">{Number(item.quantity)}</td>
              <td className="py-3 px-4 text-right">
                ₱{Number(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-3 px-4 text-right font-medium">
                ₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>₱{Number(invoice.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>
          {Number(invoice.discount_amount) > 0 && (
            <div className="flex justify-between text-sm text-green-700 font-medium">
              <span>Discount:</span>
              <span>-₱{Number(invoice.discount_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {Number(invoice.penalty_amount) > 0 && (
            <div className="flex justify-between text-sm text-red-700 font-medium">
              <span>Penalties:</span>
              <span>+₱{Number(invoice.penalty_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>₱{Number(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-700">₱{Number(invoice.amount_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xl font-black bg-gray-100 p-2 rounded">
            <span>BALANCE:</span>
            <span>₱{Number(invoice.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-dashed pt-8 text-xs text-gray-500">
        <p className="font-bold mb-2 uppercase">Payment Instructions:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Please pay on or before the due date to avoid a 5% late penalty.</li>
          <li>Payments can be made via GCash (09XX-XXX-XXXX) or Maya (Account: {branding.hoaName}).</li>
          <li>For bank transfers: BDO Account #XXXX-XXXX-XXXX ({branding.hoaName} Homeowners Association).</li>
          <li>Please present this statement when paying at the HOA Office.</li>
        </ul>
        <div className="mt-12 flex justify-between">
          <div className="w-48 border-t border-black pt-2 text-center">
            <p className="font-bold">HOA Treasurer</p>
            <p>Prepared By</p>
          </div>
          <div className="w-48 border-t border-black pt-2 text-center">
            <p className="font-bold">Homeowner / Proxy</p>
            <p>Received By / Date</p>
          </div>
        </div>
      </div>
    </div>
  )
}
