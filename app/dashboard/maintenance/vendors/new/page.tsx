
import { PageHeader } from "@/components/ui/page-header"
import { MaintenanceVendorForm } from "@/components/forms/maintenance-vendor-form"

export default function NewVendorPage() {
  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <PageHeader
        title="Register Service Vendor"
        description="Add a new service provider or accredited technician to the HOA registry"
      />
      <MaintenanceVendorForm />
    </div>
  )
}
