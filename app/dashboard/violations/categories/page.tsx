
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, FileText } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'

export default async function ViolationCategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('violation_categories')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Violation Categories"
        description="Manage standard violation guidelines and baseline fine schedules"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/violations/categories/new">
              <Plus className="mr-2 size-4" />
              Add Category
            </Link>
          </Button>
        }
      />

      {(!categories || categories.length === 0) ? (
        <EmptyState
          title="No Categories Configured"
          description="You don't have any violation categories defined. Create categories like Unauthorized Parking, Noise Violations, or Architectural Deviations."
          icon={FileText}
          actionLabel="Add Category"
          actionHref="/dashboard/violations/categories/new"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="shadow-sm border-muted/60 transition-all hover:shadow-md">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-bold text-primary">{cat.name}</CardTitle>
                  <Button variant="ghost" size="sm" asChild className="size-9 p-0 hover:bg-muted">
                    <Link href={`/dashboard/violations/categories/${cat.id}/edit`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px]">
                  {cat.description || 'No specific description provided'}
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-2">
                <div className="flex items-center justify-between text-sm py-2 border-y border-muted/60">
                  <span className="text-muted-foreground font-medium">Standard Fine</span>
                  <span className="font-bold text-primary">
                    ₱{Number(cat.fine_amount).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
