
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Phone, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { Wrench } from 'lucide-react'

export default async function VendorsPage() {
  const supabase = await createClient()

  const { data: vendors } = await supabase
    .from('maintenance_vendors')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Service Vendors Directory"
        description="Manage accredited service contractors and maintenance technicians"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/maintenance">
                View Requests
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/dashboard/maintenance/vendors/new">
                <Plus className="mr-2 size-4" />
                Add Vendor
              </Link>
            </Button>
          </div>
        }
      />

      {(!vendors || vendors.length === 0) ? (
        <EmptyState
          title="No Registered Vendors"
          description="Register service providers, plumbers, electricians, or landscapers to route and schedule maintenance work orders."
          icon={Wrench}
          actionLabel="Register Vendor"
          actionHref="/dashboard/maintenance/vendors/new"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="shadow-sm border-muted/60 transition-all hover:shadow-md">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <CardTitle className="text-lg font-bold text-primary">{vendor.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 font-semibold text-xs">
                      {vendor.specialty}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild className="size-9 p-0 hover:bg-muted">
                      <Link href={`/dashboard/maintenance/vendors/${vendor.id}/edit`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-2 space-y-3 text-sm">
                {vendor.contact_person && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="size-4 text-primary/70" />
                    <span>{vendor.contact_person}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-4 text-primary/70" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-4 text-primary/70" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-muted/60">
                  <span className="text-muted-foreground font-semibold uppercase">Status</span>
                  <Badge
                    variant="outline"
                    className={
                      vendor.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {vendor.status === 'active' ? 'Available' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
