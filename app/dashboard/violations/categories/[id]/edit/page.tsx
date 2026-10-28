
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from "@/components/ui/page-header"
import { ViolationCategoryForm } from "@/components/forms/violation-category-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditViolationCategoryPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('violation_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (!category) {
    notFound()
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <PageHeader
        title="Edit Violation Category"
        description={`Modify guidelines for ${category.name}`}
      />
      <ViolationCategoryForm category={category} />
    </div>
  )
}
