'use client'

import { Separator } from '@/components/ui/separator'
import { Printer, Globe, Mail, Key, ShieldCheck, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getBranding, DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'

interface PrintableCredentialsProps {
  resident: {
    first_name: string
    last_name: string
    email: string
    tempPassword?: string
    resident_type: string
  }
  property: {
    block: string
    lot: string
  }
  portalUrl: string
  autoPrint?: boolean
}

export function PrintableCredentials({ 
  resident, 
  property, 
  portalUrl,
  autoPrint 
}: PrintableCredentialsProps) {
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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}`

  return (
    <div className="bg-white min-h-screen text-black">
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.4in;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .print-header {
            margin-bottom: 1rem !important;
          }
          .print-header h1 {
            font-size: 1.875rem !important; /* text-3xl */
            margin-bottom: 0.25rem !important;
          }
          .print-header p {
            font-size: 0.75rem !important;
          }
          .print-separator {
            margin-top: 0.75rem !important;
            margin-bottom: 0.75rem !important;
          }
          .print-welcome {
            margin-bottom: 1rem !important;
          }
          .print-welcome h2 {
            font-size: 1.125rem !important; /* text-lg */
            margin-bottom: 0.25rem !important;
          }
          .print-welcome p {
            font-size: 0.875rem !important; /* text-sm */
            line-height: 1.25rem !important;
          }
          .print-card {
            padding: 1rem !important;
            margin-bottom: 1rem !important;
          }
          .print-card h3 {
            margin-bottom: 0.75rem !important;
          }
          .print-card .space-y-6 > * + * {
            margin-top: 0.75rem !important;
          }
          .print-grid {
            margin-bottom: 1rem !important;
            gap: 1.5rem !important;
          }
          .print-grid h3 {
            font-size: 1rem !important;
            margin-bottom: 0.5rem !important;
          }
          .print-grid ol {
            font-size: 0.75rem !important;
          }
          .print-grid ol li {
            margin-bottom: 0.5rem !important;
          }
          .print-features {
            margin-bottom: 1rem !important;
          }
          .print-features h3 {
            margin-bottom: 0.5rem !important;
          }
          .print-features .grid {
            gap-y: 0.25rem !important;
          }
          .print-footer {
            margin-top: 1.5rem !important;
            padding-top: 0.75rem !important;
          }
        }
      `}</style>

      <div className="p-8 max-w-[8.5in] mx-auto bg-white print-container">
      {/* Print button — hidden when actually printing */}
      <div className="fixed bottom-8 right-8 print:hidden z-50">
        <button
          onClick={() => window.print()}
          className="bg-black text-white px-8 py-4 rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 font-bold uppercase tracking-wider"
        >
          <Printer className="size-5" />
          Print Access Guide
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-12 print-header">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{branding.hoaName}</h1>
        <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Resident Portal Access Guide</p>
      </div>

      <Separator className="my-8 bg-black/10 print-separator" />

      {/* Welcome Section */}
      <div className="mb-12 print-welcome">
        <h2 className="text-xl font-bold mb-4">Welcome, {resident.first_name}!</h2>
        <p className="text-gray-700 leading-relaxed">
          Your resident account for the **{branding.hoaName} Management Platform** has been successfully created. 
          Use this guide to access your digital portal where you can view your billing statements, record payments, book amenities, and more.
        </p>
      </div>

      {/* Credentials Card */}
      <div className="border-2 border-black p-8 rounded-lg mb-12 bg-gray-50/50 print-card">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
          <ShieldCheck className="size-4" /> Your Secure Login Credentials
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-black p-2 rounded shrink-0">
              <Mail className="size-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-1">Email Address</p>
              <p className="text-lg font-mono font-bold">{resident.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-black p-2 rounded shrink-0">
              <Key className="size-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-1">Temporary Password</p>
              <p className="text-lg font-mono font-bold">{resident.tempPassword || '••••••••'}</p>
              <p className="text-[10px] text-gray-500 mt-1 italic">Note: You may change this in your profile settings after logging in.</p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Access */}
      <div className="grid md:grid-cols-2 gap-12 mb-12 print-grid">
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Globe className="size-5" /> How to Access
          </h3>
          <ol className="list-decimal pl-5 space-y-4 text-sm text-gray-700">
            <li>
              Scan the QR code or visit: <br />
              <span className="font-bold text-black underline break-all">{portalUrl}</span>
            </li>
            <li>Enter your registered email and the temporary password provided above.</li>
            <li>Once logged in, you will have full access to your property records and HOA services.</li>
          </ol>
        </div>
        
        <div className="flex flex-col items-center justify-center p-4 border rounded-lg border-dashed border-gray-300">
          <img src={qrUrl} alt="Portal QR Code" className="size-32 mb-3" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Scan to Open Portal</p>
        </div>
      </div>

      <Separator className="my-8 bg-black/10 print-separator" />

      {/* Features List */}
      <div className="mb-12 print-features">
        <h3 className="text-sm font-black uppercase tracking-widest mb-6">Portal Features</h3>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs font-medium">
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-black rounded-full" />
            <span>Digital Billing & SOA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-black rounded-full" />
            <span>Water Meter Monitoring</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-black rounded-full" />
            <span>Amenity Reservations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-black rounded-full" />
            <span>Payment Recording</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-black rounded-full" />
            <span>Vehicle Stickers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-black rounded-full" />
            <span>Community Announcements</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-12 border-t border-black/5 text-[10px] text-gray-500 leading-relaxed print-footer">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="font-bold text-black uppercase">{branding.hoaName} Administration</p>
            <p>Property: Block {property.block}, Lot {property.lot}</p>
            <p>Email: {branding.hoaHelpdeskEmail}</p>
            <p>Office Hours: Mon-Fri, 8AM - 5PM</p>
          </div>
          <div className="text-right italic">
            Printed on {new Date().toLocaleDateString('en-PH', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
