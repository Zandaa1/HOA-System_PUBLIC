
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PropertyForm } from '@/components/forms/property-form'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { GenerateResidentCredentials } from '@/components/generate-resident-credentials'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  const { data: property } = await supabase
    .from('properties')
    .select(
      `
      *,
      property_type:property_types(*),
      homeowners(*)
    `,
    )
    .eq('id', id)
    .single()

  if (!property) {
    notFound()
  }

  const { data: propertyTypes } = await supabase
    .from('property_types')
    .select('*')

  // Get users linked to this property's residents
  const residentUserIds = [
    ...(property.homeowners?.map((h: any) => h.user_id) || []),
  ].filter(Boolean) as string[]

  const { data: authUsers, error: authUsersError } =
    await supabaseAdmin.auth.admin.listUsers()

  if (authUsersError) {
    console.error('Error listing auth users:', authUsersError)
  }

  const linkedUsers = authUsers?.users.filter((u) =>
    residentUserIds.includes(u.id),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/properties" className="hover:text-primary transition-colors">
              Properties
            </Link>
            <span>/</span>
            <Link href={`/dashboard/properties/${id}`} className="hover:text-primary transition-colors">
              Blk {property.block} Lot {property.lot}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Edit</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Property
          </h1>
          <p className="text-sm text-muted-foreground">
            Block {property.block}, Lot {property.lot}
          </p>
        </div>
        <GenerateResidentCredentials
          property={property}
          linkedUsers={linkedUsers || []}
          className="h-9 px-4 font-medium text-xs w-auto"
        />
      </div>

      <PropertyForm property={property} propertyTypes={propertyTypes || []} />
    </div>
  )
}
