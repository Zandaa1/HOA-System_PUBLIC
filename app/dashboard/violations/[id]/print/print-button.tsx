'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold text-sm hover:opacity-90 shadow-sm"
    >
      <Printer className="h-4 w-4" />
      Print Notice
    </button>
  )
}
