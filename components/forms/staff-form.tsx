'use client'

import { getErrorMessage, cn } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Staff } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { ACCESS_GROUPS } from '@/lib/modules'

interface StaffFormProps {
  staff?: Staff
  isDeveloper?: boolean
}

export function StaffForm({ staff }: StaffFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [allAccess, setAllAccess] = useState(!!staff?.permissions?.all)
  const [accessPerms, setAccessPerms] = useState<Record<string, boolean>>(() => {
    const initial = staff?.permissions || { overview: true }
    const perms: Record<string, boolean> = {}
    for (const group of ACCESS_GROUPS) {
      perms[group.key] = !!initial[group.key] || !!initial.all
    }
    return perms
  })

  const [formData, setFormData] = useState({
    employee_id: staff?.employee_id || '',
    first_name: staff?.first_name || '',
    last_name: staff?.last_name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    position: staff?.position || '',
    password: '',
    confirmPassword: '',
    is_active: staff?.is_active ?? true,
  })

  const handleAllAccessChange = (checked: boolean) => {
    setAllAccess(checked)
    if (checked) {
      const next: Record<string, boolean> = {}
      for (const group of ACCESS_GROUPS) {
        next[group.key] = true
      }
      setAccessPerms(next)
    }
  }

  const handleAccessChange = (key: string, checked: boolean) => {
    const next = { ...accessPerms, [key]: checked }
    setAccessPerms(next)
    if (allAccess && !checked) {
      setAllAccess(false)
    }
  }

  const generatePassword = () => {
    const prefixes = ['Demo', 'Staff', 'Gate', 'Admin', 'Zone']
    const words = ['Secure', 'Access', 'Key', 'Pass', 'Token', 'Base', 'Team']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const word = words[Math.floor(Math.random() * words.length)]
    const num = Math.floor(1000 + Math.random() * 9000)
    const generated = `${prefix}-${word}-${num}`
    
    setFormData((prev) => ({
      ...prev,
      password: generated,
      confirmPassword: generated,
    }))
    setShowPassword(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!staff && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const staffData = {
      employee_id: formData.employee_id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone || null,
      position: formData.position || null,
      is_active: formData.is_active,
      permissions: allAccess
        ? { all: true }
        : Object.fromEntries(Object.entries(accessPerms).filter(([, value]) => value)),
    }

    try {
      let staffId = staff?.id

      if (staff) {
        const { error } = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', staff.id)
        if (error) throw error
      } else {
        const response = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...staffData,
            password: formData.password || null,
          }),
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to create staff member')
        staffId = result.staff_id
      }

      router.push('/dashboard/admin/staff')
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employee_id">Employee ID *</Label>
            <Input
              id="employee_id"
              placeholder="e.g. SV-2026-001"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position / Job Title</Label>
            <Input
              id="position"
              placeholder="e.g. Clerk, Guard, Accountant"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Login Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. staff@example.invalid"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="e.g. 0917XXXXXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          {!staff && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Login Password *</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-semibold text-primary"
                    onClick={generatePassword}
                  >
                    Generate Readable Password
                  </Button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter temporary password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password to verify"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2 sm:col-span-2">
                <Checkbox
                  id="show-password"
                  checked={showPassword}
                  onCheckedChange={(checked) => setShowPassword(!!checked)}
                />
                <Label htmlFor="show-password" className="text-xs font-normal cursor-pointer text-muted-foreground select-none">
                  Show Password (makes it easier to copy and avoid mistakes)
                </Label>
              </div>
            </>
          )}
          <div className="flex items-center space-x-2 pt-4 sm:col-span-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <div className="grid gap-0.5">
              <Label htmlFor="is_active">Active Account</Label>
              <p className="text-xs text-muted-foreground">Allow this staff member to log in to the system</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="all-access" className="font-semibold">Full Access</Label>
              <p className="text-xs text-muted-foreground">
                Allow this staff member to open every staff page and administration tool.
              </p>
            </div>
            <Switch
              id="all-access"
              checked={allAccess}
              onCheckedChange={handleAllAccessChange}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACCESS_GROUPS.map((group) => {
              const checked = allAccess || !!accessPerms[group.key]
              return (
                <label
                  key={group.key}
                  htmlFor={`access-${group.key}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                    checked ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/30',
                  )}
                >
                  <Checkbox
                    id={`access-${group.key}`}
                    checked={checked}
                    disabled={allAccess}
                    onCheckedChange={(value) => handleAccessChange(group.key, !!value)}
                    className="mt-0.5"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold">{group.label}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {group.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <FormGuide
        notes={[
          'Admins must set an initial password for new staff members.',
          "The 'Employee ID' is used for internal tracking and should match HR records.",
          'Staff access is controlled by the checklist above.',
          'Deactivating a staff account immediately revokes all system access.',
        ]}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {staff ? 'Update Staff Member' : 'Create Staff Member'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
