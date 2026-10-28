
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { ViolationForm } from "@/components/forms/violation-form"

export default async function NewViolationPage() {
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase
    .from('violation_categories')
    .select('*')
    .order('name')

  // Fetch properties (block & lot)
  const { data: properties } = await supabase
    .from('properties')
    .select('id, block, lot, phase')
    .order('block')
    .order('lot')

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Log Property Violation"
        description="Record a new property violation with discretionary fines/warnings"
      />
      <ViolationForm
        categories={categories || []}
        properties={(properties || []) as any}
      />
    </div>
  )
}
