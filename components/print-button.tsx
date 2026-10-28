'use client'

import { Printer } from 'lucide-react'

interface PrintButtonProps {
  label?: string
  className?: string
}

export function PrintButton({ label = 'Print', className }: PrintButtonProps) {
  return (
    <div className={`fixed bottom-8 right-8 print:hidden z-50 ${className ?? ''}`}>
      <button
        onClick={() => window.print()}
        className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 font-bold"
      >
        <Printer className="size-5" />
        {label}
      </button>
    </div>
  )
}
