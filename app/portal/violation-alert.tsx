'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldAlert, X, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ViolationAlertProps {
  violations: any[]
}

export function ViolationAlert({ violations }: ViolationAlertProps) {
  const [activeViolations, setActiveViolations] = useState(violations)
  const supabase = createClient()

  const handleDismiss = async (id: string) => {
    try {
      const { error } = await supabase
        .from('violations')
        .update({ portal_alert_dismissed: true })
        .eq('id', id)

      if (error) throw error

      setActiveViolations((prev) => prev.filter((v) => v.id !== id))
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
    }
  }

  if (activeViolations.length === 0) return null

  return (
    <div className="space-y-3">
      {activeViolations.map((violation) => (
        <div
          key={violation.id}
          className="relative flex flex-col gap-3 rounded-lg border border-status-overdue-border bg-status-overdue-bg p-4 text-status-overdue shadow-sm md:flex-row md:items-center md:justify-between motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:duration-300"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-status-overdue shrink-0" />
            <div>
              <p className="font-bold uppercase tracking-wider text-xs text-status-overdue">
                Notice of Property Violation
              </p>
              <h4 className="font-bold text-sm text-foreground mt-0.5">{violation.title}</h4>
              {violation.description && (
                <p className="text-xs text-status-overdue/90 mt-1 leading-relaxed max-w-xl">
                  {violation.description}
                </p>
              )}
              {violation.status === 'fine_issued' && violation.fine_applied > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-status-overdue">
                  <Landmark className="h-3.5 w-3.5 shrink-0" />
                  <span>Fine Assessed: ₱{Number(violation.fine_applied).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center shrink-0 pl-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDismiss(violation.id)}
              className="h-8 border-status-overdue-border bg-background hover:bg-status-overdue-bg hover:text-status-overdue text-status-overdue font-semibold"
            >
              Acknowledge & Close
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
