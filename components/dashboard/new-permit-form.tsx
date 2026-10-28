'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createPermitAction } from '@/lib/actions/permits'
import { Loader2 } from 'lucide-react'

interface NewPermitFormProps {
  properties: any[]
  isAdmin?: boolean
}

export function NewPermitForm({ properties, isAdmin = true }: NewPermitFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    property_id: '',
    applicant_name: '',
    permit_type: 'renovation',
    description: '',
    start_date: new Date().toISOString().slice(0, 10),
    estimated_end_date: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.property_id) {
      toast.error('Please select a property')
      return
    }
    if (!formData.applicant_name) {
      toast.error('Please enter the applicant name')
      return
    }
    if (!formData.start_date || !formData.estimated_end_date) {
      toast.error('Please enter the start and end dates')
      return
    }

    startTransition(async () => {
      try {
        await createPermitAction({
          property_id: formData.property_id,
          applicant_name: formData.applicant_name,
          permit_type: formData.permit_type as any,
          description: formData.description,
          start_date: formData.start_date,
          estimated_end_date: formData.estimated_end_date,
        })
        toast.success('Permit application submitted successfully.')
        router.push(isAdmin ? '/dashboard/permits' : '/portal/permits')
      } catch (err: any) {
        toast.error(`Submission failed: ${err.message}`)
      }
    })
  }

  return (
    <Card className="max-w-2xl border-muted/60 shadow-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Application Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="property">Subdivision Lot / Property</Label>
            <Select
              value={formData.property_id}
              onValueChange={(val) => setFormData({ ...formData, property_id: val })}
            >
              <SelectTrigger id="property">
                <SelectValue placeholder="Select block and lot" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Block {p.block} Lot {p.lot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicant">Applicant (Homeowner Name)</Label>
            <Input
              id="applicant"
              placeholder="e.g. John Doe"
              value={formData.applicant_name}
              onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Permit Type</Label>
              <Select
                value={formData.permit_type}
                onValueChange={(val) => setFormData({ ...formData, permit_type: val })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renovation">Renovation</SelectItem>
                  <SelectItem value="new_construction">New Construction</SelectItem>
                  <SelectItem value="demolition">Demolition</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Scope / Short Description</Label>
              <Input
                id="desc"
                placeholder="e.g. Backyard extension"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start Date</Label>
              <Input
                id="start"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">Estimated Completion Date</Label>
              <Input
                id="end"
                type="date"
                value={formData.estimated_end_date}
                onChange={(e) => setFormData({ ...formData, estimated_end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-muted/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(isAdmin ? '/dashboard/permits' : '/portal/permits')}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit Application
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
