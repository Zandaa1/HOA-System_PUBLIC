
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { requireModule } from '@/lib/check-module'
import { AmenitiesGrid } from './amenities-grid'

export default async function AmenitiesPage() {
  await requireModule('enable_amenities')
  const supabase = await createClient()

  const { data: amenities } = await supabase
    .from('amenities')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Amenities"
        description="Manage subdivision facilities"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/amenities/new">
              <Plus className="mr-2 size-4" />
              Add Amenity
            </Link>
          </Button>
        }
      />

      <AmenitiesGrid amenities={amenities || []} />
    </div>
  )
}
