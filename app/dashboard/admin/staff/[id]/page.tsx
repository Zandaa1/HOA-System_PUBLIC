
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { ACCESS_GROUPS } from '@/lib/modules'

interface StaffPageProps {
  params: Promise<{ id: string }>
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const staffResponse = await supabase.from('staff').select('*').eq('id', id).single()

  const staff = staffResponse.data
  if (!staff) notFound()

  const permissions = staff.permissions || {}
  const accessGroups = permissions.all
    ? ACCESS_GROUPS
    : ACCESS_GROUPS.filter((group) => permissions[group.key])

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`${staff.first_name} ${staff.last_name}`}
        description={staff.position || 'Staff Member'}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon-sm" className="size-9 shadow-sm" title="Back to List">
              <Link href="/dashboard/admin/staff">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href={`/dashboard/admin/staff/${staff.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit Profile
              </Link>
            </Button>
          </div>
        }
      >
        <Badge variant="secondary" className={cn(
          "ml-2 font-bold text-[10px] uppercase border",
          staff.is_active
            ? "bg-status-paid-bg text-status-paid border-status-paid-border"
            : "bg-status-inactive-bg text-status-inactive border-status-inactive-border"
        )}>
          {staff.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 px-6">
        <Card className="shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Address</span>
              <p className="text-sm font-medium">{staff.email}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone Number</span>
              <p className="text-sm font-medium">{staff.phone || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Employee ID</span>
              <p className="text-sm font-medium">{staff.employee_id}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Position</span>
              <p className="text-sm font-medium">{staff.position || 'N/A'}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Joined Date</span>
              <p className="text-sm font-medium">{new Date(staff.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-6">
        <Card className="shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Access Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {accessGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No access areas enabled.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {permissions.all && (
                  <Badge variant="secondary" className="text-xs gap-1.5 py-1.5 px-3">
                    <ShieldCheck className="size-3.5" />
                    Full Access
                  </Badge>
                )}
                {!permissions.all && accessGroups.map((group) => (
                  <Badge key={group.key} variant="secondary" className="text-xs gap-1.5 py-1.5 px-3">
                    <ShieldCheck className="size-3.5" />
                    {group.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
