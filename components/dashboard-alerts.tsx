'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FlaskConical, Settings, X } from 'lucide-react'

interface DashboardAlertsProps {
  testDataEnabled: boolean
  hideTestDataAlert: boolean
  setupCompleted: boolean
  isDeveloper?: boolean
}

export function DashboardAlerts({ testDataEnabled, hideTestDataAlert, setupCompleted, isDeveloper }: DashboardAlertsProps) {
  const pathname = usePathname()
  const isSetupPage = pathname === '/dashboard/setup'
  const [dismissedTestData, setDismissedTestData] = useState(false)
  const [dismissedSetup, setDismissedSetup] = useState(false)

  return (
    <>
      {!isSetupPage && testDataEnabled && !hideTestDataAlert && !dismissedTestData && (
        <Alert className="w-full mb-6 print:hidden py-2 px-4 border-border bg-muted/20 text-xs flex items-center gap-3 overflow-hidden">
          <FlaskConical className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-semibold shrink-0 text-foreground">Test Data Active:</span>
            <span className="text-muted-foreground min-w-0">
              Development test data is loaded. Remove with{' '}
              <code className="text-[10px] font-mono bg-muted/40 border border-border/50 px-1.5 py-0.5 rounded text-foreground/70 whitespace-nowrap">
                npx tsx scripts/delete_test_data.ts
              </code>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 ml-auto shrink-0 text-muted-foreground/40 hover:text-foreground/60 hover:bg-muted/50"
            onClick={() => setDismissedTestData(true)}
            aria-label="Dismiss test data alert"
            title="Dismiss test data alert"
          >
            <X className="size-3" />
          </Button>
        </Alert>
      )}
      {!isSetupPage && !setupCompleted && !dismissedSetup && (
        <Alert className="w-full mb-6 print:hidden py-2 px-4 border-border bg-muted/20 text-xs flex items-center gap-3 overflow-hidden">
          <Settings className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            {isDeveloper ? (
              <>
                <span className="font-semibold shrink-0 text-foreground">First-Time Setup:</span>
                <span className="text-muted-foreground min-w-0">
                  The HOA platform has not been configured yet. Contact the HOA owner to complete initial setup.
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold shrink-0 text-foreground">First-Time Setup:</span>
                <span className="text-muted-foreground min-w-0">
                  Configure your HOA name, logo, and modules.{' '}
                </span>
                <Link href="/dashboard/setup" className="font-semibold underline hover:text-foreground shrink-0 text-muted-foreground">
                  Open Setup Wizard
                </Link>
                <span className="text-muted-foreground/30 shrink-0">·</span>
                <span className="text-muted-foreground/60 min-w-0">
                  You can also configure these later in{' '}
                  <strong>Settings → General</strong>.
                </span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 ml-auto shrink-0 text-muted-foreground/40 hover:text-foreground/60 hover:bg-muted/50"
            onClick={() => setDismissedSetup(true)}
            aria-label="Dismiss setup alert"
            title="Dismiss setup alert"
          >
            <X className="size-3" />
          </Button>
        </Alert>
      )}
    </>
  )
}
