import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ForceResetForm } from './force-reset-form'

export default function ForceResetPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-6">
      <Card className="w-full max-w-md border-outline shadow-sm">
        <CardHeader>
          <CardTitle>Change Your Password</CardTitle>
          <CardDescription>
            You are using a temporary password. Please set a new password to continue accessing the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForceResetForm />
        </CardContent>
      </Card>
    </div>
  )
}
