
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Eye, Building2 } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'

export default async function PropertyTypesPage() {
  const supabase = await createClient()

  const { data: propertyTypes } = await supabase
    .from('property_types')
    .select('*, properties:properties(count)')
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Property Types"
        description="Manage property classifications"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/properties/types/new">
              <Plus className="mr-2 size-4" />
              Add Type
            </Link>
          </Button>
        }
      />

      {(!propertyTypes || propertyTypes.length === 0) ? (
        <EmptyState
          title="No Property Types Yet"
          description="You don't have any property classifications defined. Create a property type (e.g., Residential, Commercial, Townhouse) to begin classifying subdivision lots."
          icon={Building2}
          actionLabel="Add Type"
          actionHref="/dashboard/properties/types/new"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {propertyTypes.map((type) => (
            <Card key={type.id} className="shadow-sm border-muted/60 transition-all hover:shadow-md">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-4 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: type.color }}
                    />
                    <CardTitle className="text-lg font-bold text-primary">{type.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild className="size-9 p-0 hover:bg-muted">
                      <Link href={`/dashboard/properties/types/${type.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="size-9 p-0 hover:bg-muted">
                      <Link href={`/dashboard/properties/types/${type.id}/edit`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px]">
                  {type.description || 'No description provided'}
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <div className="flex items-center justify-between text-sm py-2 border-y border-muted/60">
                  <span className="text-muted-foreground font-medium">Monthly Dues</span>
                  <span className="font-bold text-primary">
                    ₱{Number(type.default_monthly_dues).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Properties Linked</span>
                  <Badge variant="secondary" className="font-bold tabular-nums bg-primary/5 text-primary">
                    {(type.properties as { count: number }[])?.[0]?.count || 0}
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
