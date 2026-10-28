import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react'

interface ModuleGuardProps {
  moduleName: string
  isEnabled: boolean
  dependencies: { name: string; isEnabled: boolean }[]
}

export function ModuleGuard({ moduleName, isEnabled, dependencies }: ModuleGuardProps) {
  if (isEnabled) return null

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2 text-destructive">
            <ShieldAlert className="size-5" />
            <CardTitle className="text-xl">Module Disabled</CardTitle>
          </div>
          <CardDescription>
            The <strong>{moduleName}</strong> module is currently disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Module Dependencies:</h4>
            <div className="space-y-2">
              {dependencies.map((dep, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-muted/40">
                  <span className="text-sm font-medium">{dep.name}</span>
                  {dep.isEnabled ? (
                    <span className="flex items-center text-xs font-semibold text-green-600 gap-1">
                      <CheckCircle2 className="size-4" /> Enabled
                    </span>
                  ) : (
                    <span className="flex items-center text-xs font-semibold text-destructive gap-1">
                      <XCircle className="size-4" /> Disabled
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 size-4" />
                Go to Settings to Enable
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
