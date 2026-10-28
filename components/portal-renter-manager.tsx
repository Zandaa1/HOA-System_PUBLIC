'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, Phone, Plus, Pencil, Trash2 } from 'lucide-react'
import { Renter } from '@/lib/types/database'
import { useToast } from '@/components/ui/use-toast'

interface PortalRenterManagerProps {
  initialRenters: any[]
  propertyId: string
}

export function PortalRenterManager({ initialRenters, propertyId }: PortalRenterManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [renters, setRenters] = useState<any[]>(initialRenters)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRenter, setEditingRenter] = useState<any | null>(null)
  
  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isActive, setIsActive] = useState(true)
  
  const [isPending, startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openAddDialog = () => {
    setEditingRenter(null)
    setFirstName('')
    setLastName('')
    setMiddleName('')
    setEmail('')
    setPhone('')
    setIsActive(true)
    setIsDialogOpen(true)
  }

  const openEditDialog = (renter: any) => {
    setEditingRenter(renter)
    setFirstName(renter.first_name || '')
    setLastName(renter.last_name || '')
    setMiddleName(renter.middle_name || '')
    setEmail(renter.email || '')
    setPhone(renter.phone || '')
    setIsActive(renter.is_active ?? true)
    setIsDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName) {
      toast({
        title: 'Error',
        description: 'First name and last name are required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()
    
    try {
      if (editingRenter) {
        // Update
        const { error } = await supabase
          .from('renters')
          .update({
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName || null,
            email: email || null,
            phone: phone || null,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRenter.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Tenant information updated successfully.',
        })
      } else {
        // Insert
        const { error } = await supabase
          .from('renters')
          .insert({
            property_id: propertyId,
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName || null,
            email: email || null,
            phone: phone || null,
            is_active: isActive
          })

        if (error) throw error

        toast({
          title: 'Success',
          description: 'New tenant registered successfully.',
        })
      }

      setIsDialogOpen(false)
      
      // Fetch updated list
      const { data: updated, error: fetchErr } = await supabase
        .from('renters')
        .select('id, first_name, last_name, middle_name, email, phone, is_active')
        .eq('property_id', propertyId)
        
      if (!fetchErr && updated) {
        setRenters(updated)
      }
      
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save renter details.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this tenant from your roster?')) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('renters')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Tenant removed successfully.',
      })

      // Fetch updated list
      const { data: updated, error: fetchErr } = await supabase
        .from('renters')
        .select('id, first_name, last_name, middle_name, email, phone, is_active')
        .eq('property_id', propertyId)
        
      if (!fetchErr && updated) {
        setRenters(updated)
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete renter.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Renters (Tenants)</h3>
        <Button size="sm" onClick={openAddDialog} className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          Add Tenant
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {renters && renters.length > 0 ? (
          renters.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 p-4 rounded-lg border border-slate-100 bg-slate-50/50 relative group">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">
                  {r.first_name} {r.last_name}
                </span>
                <div className="flex items-center gap-1.5">
                  {r.is_active ? (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 text-[10px] py-0 font-medium">Active Tenant</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] py-0 font-medium">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1.5 mt-3">
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5" />
                  <span className="truncate">{r.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5" />
                  <span>{r.phone || 'No phone registered'}</span>
                </div>
              </div>

              {/* Edit/Delete actions */}
              <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/50 p-1 rounded border shadow-sm">
                <Button size="icon" variant="ghost" className="size-7 text-slate-500 hover:text-slate-900" onClick={() => openEditDialog(r)}>
                  <Pencil className="size-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-rose-500 hover:text-rose-700" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-8 border border-dashed rounded-lg p-6 text-sm text-muted-foreground">
            <p className="italic">No renters registered on this property.</p>
            <p className="mt-1 text-xs">If you lease this property, you can register your tenants above to keep the HOA contact directory updated.</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRenter ? 'Edit Tenant Contact Info' : 'Register Tenant'}</DialogTitle>
            <DialogDescription>
              {editingRenter 
                ? 'Update your tenant\'s personal details for the HOA contact registry.' 
                : 'Add contact details of the tenant currently residing in your property.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Juan"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. dela Cruz"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="middleName">Middle Name (Optional)</Label>
              <Input
                id="middleName"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. Santos"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. resident@example.invalid"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 09171234567"
              />
            </div>

            {editingRenter && (
              <div className="flex items-center justify-between border-t pt-3">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-sm font-semibold">Active Status</Label>
                  <p className="text-xs text-muted-foreground">Toggle off if the tenant has moved out.</p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
