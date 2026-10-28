
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

export default async function PropertyTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: propertyType }, { count: propertyCount }] = await Promise.all([
    supabase.from('property_types').select('*').eq('id', id).single(),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('property_type_id', id),
  ])

  if (!propertyType) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/properties/types">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{propertyType.name}</h1>
            <p className="text-sm text-muted-foreground">Property type profile</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/dashboard/properties/types/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit Type
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Default Monthly Dues</span>
            <span>₱{Number(propertyType.default_monthly_dues).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Linked Properties</span>
            <span>{propertyCount || 0}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-muted-foreground">Color</span>
            <Badge variant="outline" style={{ borderColor: propertyType.color, color: propertyType.color }}>
              {propertyType.color}
            </Badge>
          </div>
          {propertyType.description && (
            <div className="pt-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Description</p>
              <p>{propertyType.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
