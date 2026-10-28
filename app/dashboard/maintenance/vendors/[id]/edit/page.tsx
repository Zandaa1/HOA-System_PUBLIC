
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from "@/components/ui/page-header"
import { MaintenanceVendorForm } from "@/components/forms/maintenance-vendor-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditVendorPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vendor } = await supabase
    .from('maintenance_vendors')
    .select('*')
    .eq('id', id)
    .single()

  if (!vendor) {
    notFound()
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <PageHeader
        title="Edit Vendor Details"
        description={`Modify information for ${vendor.name}`}
      />
      <MaintenanceVendorForm vendor={vendor} />
    </div>
  )
}
