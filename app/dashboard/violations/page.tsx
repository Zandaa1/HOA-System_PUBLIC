
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { ViolationsTable } from './violations-table'
import { CategoriesTable } from './categories-table'
import { requireModule } from '@/lib/check-module'

export default async function ViolationsPage() {
  await requireModule('enable_violations')
  const supabase = await createClient()

  // Fetch Violations
  const { data: violations } = await supabase
    .from('violations')
    .select(`
      *,
      property:properties(id, block, lot, phase),
      category:violation_categories(name)
    `)
    .order('incident_date', { ascending: false })

  // Fetch Categories
  const { data: categories } = await supabase
    .from('violation_categories')
    .select('*')
    .order('name')

  // Calculate summaries
  const allViolations = violations || []
  const activeWarnings = allViolations.filter(v => v.status === 'warning_issued').length
  const activeFines = allViolations.filter(v => v.status === 'fine_issued').length
  const totalFineValue = allViolations
    .filter(v => v.status === 'fine_issued')
    .reduce((sum, v) => sum + Number(v.fine_applied), 0)

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Violations & Compliance"
        description="Track property violations and manage discretionary warnings/fines"
        action={
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm" className="h-9 px-4">
              <Link href="/dashboard/violations/categories">
                <Settings className="mr-2 size-4" />
                Manage Categories
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/dashboard/violations/new">
                <Plus className="mr-2 size-4" />
                Log Violation
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Active Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-amber-600">
            {activeWarnings}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Active Fines Issued
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-red-600">
            {activeFines}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Total Fines Logged
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-foreground">
            ₱{totalFineValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="violations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="violations">All Violations</TabsTrigger>
          <TabsTrigger value="categories">Guideline Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="border-0 p-0">
          <ViolationsTable data={allViolations} />
        </TabsContent>

        <TabsContent value="categories" className="border-0 p-0">
          <CategoriesTable data={categories || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
