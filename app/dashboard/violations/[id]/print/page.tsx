
import { createClient } from '@/lib/supabase/server'
import { getBranding } from '@/lib/branding'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PrintButton } from './print-button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PrintViolationPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  const branding = getBranding(settings || [])

  // Fetch violation detail
  const { data: violation } = await supabase
    .from('violations')
    .select(`
      *,
      property:properties(
        id, block, lot, phase,
        homeowners(id, first_name, last_name, email, phone),
        renters(id, first_name, last_name, email, phone, is_active)
      ),
      category:violation_categories(*)
    `)
    .eq('id', id)
    .single()

  if (!violation) {
    notFound()
  }

  const activeRenters = violation.property?.renters?.filter((r: any) => r.is_active) || []
  const primaryResident =
    activeRenters.length > 0
      ? activeRenters[0]
      : violation.property?.homeowners?.[0]

  const residentName = primaryResident
    ? `${primaryResident.first_name} ${primaryResident.last_name}`
    : 'Resident / Property Owner'

  return (
    <div className="min-h-screen bg-white text-black p-8 sm:p-16 antialiased">
      {/* Control Actions - hidden on print */}
      <div className="mb-8 flex justify-between items-center print:hidden border-b pb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/violations/${violation.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Case
          </Link>
        </Button>
        <PrintButton />
      </div>

      {/* Official Notice Letter Template */}
      <div className="max-w-2xl mx-auto space-y-8 bg-white text-black print:p-0">
        {/* Letterhead */}
        <div className="text-center border-b-2 border-double border-gray-800 pb-6">
          <h1 className="text-xl font-bold tracking-wider uppercase">{branding.hoaFullName}</h1>
          <p className="text-xs text-gray-600 uppercase tracking-widest mt-1">Homeowners Association, Inc.</p>
          <p className="text-xs text-gray-500 mt-1">Demo community · contact@example.invalid</p>
        </div>

        {/* Date and Address */}
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Date of Notice</p>
            <p className="font-semibold">{format(new Date(), 'dd MMMM yyyy')}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Reference Case ID</p>
            <p className="font-mono text-xs">{violation.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="text-sm space-y-1">
          <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Addressed To</p>
          <p className="font-bold text-base">{residentName}</p>
          <p className="text-gray-800">
            Block {violation.property.block}, Lot {violation.property.lot}
          </p>
          <p className="text-gray-800">{branding.hoaFullName}, Quezon City</p>
        </div>

        {/* Header Title */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-900 rounded-r-md print:bg-white print:border-red-600 print:text-black">
          <h2 className="text-lg font-bold uppercase tracking-wide">Official Notice of Violation</h2>
          <p className="text-sm mt-1">This serves as formal notification of non-compliance with the HOA policies.</p>
        </div>

        {/* Notice Details */}
        <div className="space-y-4 text-sm">
          <p className="leading-relaxed">
            Dear Resident,
          </p>
          <p className="leading-relaxed">
            Please be advised that an inspection of your property was conducted on{' '}
            <span className="font-bold">{format(new Date(violation.incident_date), 'dd MMMM yyyy')}</span>, during which the
            following violation was observed:
          </p>

          <div className="bg-gray-50 p-4 rounded-md border print:bg-white print:border-gray-400 space-y-2">
            <p className="font-bold text-base text-gray-900 print:text-black">
              {violation.title}
            </p>
            {violation.description && (
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed print:text-black">
                {violation.description}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 border-t pt-3 mt-3 text-xs">
              <div>
                <span className="text-gray-500 font-bold uppercase block">Category</span>
                <span className="font-semibold text-gray-800 print:text-black">
                  {violation.category?.name || 'Rules Guideline Violation'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-bold uppercase block">Status</span>
                <span className="font-semibold text-gray-800 print:text-black">
                  {violation.status === 'warning_issued' ? 'Warning Notice Only' : 'Fine Incurred'}
                </span>
              </div>
            </div>
          </div>

          {violation.status === 'fine_issued' && (
            <div className="border border-red-200 bg-red-50/50 p-4 rounded-md print:bg-white print:border-gray-400">
              <p className="font-semibold text-red-900 print:text-black">Administrative Fine Assessed</p>
              <p className="text-xs text-red-700 mt-0.5 print:text-black">
                A fine of <span className="font-bold">₱{Number(violation.fine_applied).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>{' '}
                has been assessed against your account. Please settle this amount within fifteen (15) days of this notice.
              </p>
            </div>
          )}

          <p className="leading-relaxed">
            You are requested to take corrective action to resolve this matter immediately. If you wish to appeal this notice
            or request an extension, you must submit a written letter of appeal to the HOA Administration Office within seven (7)
            calendar days from the date of this notice.
          </p>

          <p className="leading-relaxed">
            Your immediate cooperation is highly appreciated. Let us work together to keep {branding.hoaFullName} a safe, organized,
            and pleasant community for all families.
          </p>
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Issued By</p>
            <div className="mt-8 border-t border-gray-400 pt-2 w-48 text-center">
              <p className="font-bold">HOA Security & Compliance</p>
              <p className="text-xs text-gray-500">Board Administration</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px] self-start ml-20">Received By</p>
            <div className="mt-8 border-t border-gray-400 pt-2 w-48 text-center self-start ml-20">
              <p className="font-semibold text-gray-400">Signature Over Printed Name</p>
              <p className="text-xs text-gray-500">Date Received</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inject styles to force clean print outputs */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, nav, footer, sidebar, .print\\:hidden {
            display: none !important;
          }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
          }
        }
      ` }} />
    </div>
  )
}
