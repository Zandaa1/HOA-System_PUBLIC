
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from "@/components/ui/page-header"
import { ViolationForm } from "@/components/forms/violation-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditViolationPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch violation
  const { data: violation } = await supabase
    .from('violations')
    .select('*')
    .eq('id', id)
    .single()

  if (!violation) {
    notFound()
  }

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
        title="Edit Violation Notice"
        description={`Modify violation guidelines for Case ID: ${violation.id}`}
      />
      <ViolationForm
        violation={violation}
        categories={categories || []}
        properties={(properties || []) as any}
      />
    </div>
  )
}
