
import { createClient } from '@/lib/supabase/server'
import { getBranding } from '@/lib/branding'
import { PageHeader } from "@/components/ui/page-header"
import { ViolationCategoryForm } from "@/components/forms/violation-category-form"

export default async function NewViolationCategoryPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  const branding = getBranding(settings || [])

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <PageHeader
        title="Add Violation Category"
        description={`Define standard violation context and guidelines for ${branding.hoaName}`}
      />
      <ViolationCategoryForm />
    </div>
  )
}
