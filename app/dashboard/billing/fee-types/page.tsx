
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { FeeTypesGrid } from './fee-types-grid'

export default async function FeeTypesPage() {
  const supabase = await createClient()

  const { data: feeTypes } = await supabase
    .from('fee_types')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Fee Types"
        description="Manage the types of fees and charges"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/billing/fee-types/new">
              <Plus className="mr-2 size-4" />
              Add Fee Type
            </Link>
          </Button>
        }
      />

      <FeeTypesGrid feeTypes={feeTypes || []} />
    </div>
  )
}
