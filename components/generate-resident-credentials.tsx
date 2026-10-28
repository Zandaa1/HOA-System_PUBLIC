'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, UserPlus, Key, ShieldCheck, Printer, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateResidentCredentials, resetResidentPassword } from '@/lib/actions/resident-auth'
import { sendCredentialEmail } from '@/lib/actions/send-credential-email'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface GenerateResidentCredentialsProps {
  property: any
  linkedUsers: any[]
  preselectedResidentId?: string
  preselectedResidentType?: 'homeowner' | 'renter'
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  className?: string
}

export function GenerateResidentCredentials({
  property,
  linkedUsers,
  preselectedResidentId,
  preselectedResidentType,
  triggerLabel,
  triggerVariant,
  className,
}: GenerateResidentCredentialsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedResidentId, setSelectedResidentId] = useState(preselectedResidentId || '')
  const [selectedResidentType, setSelectedResidentType] = useState(preselectedResidentType || '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const router = useRouter()

  const residents = [
    ...(property.homeowners || []),
    ...(property.renters || []),
  ]

  const unlinkedResidents = residents.filter(
    (res: any) => !linkedUsers.some((user) => user.id === res.user_id),
  )

  const isAlreadyLinked = preselectedResidentId && linkedUsers.some(user => 
    residents.find(res => res.id === preselectedResidentId)?.user_id === user.id
  )

  useEffect(() => {
    if (preselectedResidentId && !email) {
      const resident = residents.find(res => res.id === preselectedResidentId)
      if (resident) {
        setEmail(resident.email || '')
        setSelectedResidentType(resident.resident_type || (property.homeowners?.some((h: any) => h.id === resident.id) ? 'homeowner' : 'renter'))
      }
    }
  }, [preselectedResidentId, residents, property])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('propertyId', property.id)
    formData.append('residentId', selectedResidentId)
    formData.append('residentType', selectedResidentType)

    const result = isAlreadyLinked 
      ? await resetResidentPassword(formData)
      : await generateResidentCredentials(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(isAlreadyLinked ? 'Password reset successfully!' : 'Credentials generated successfully!')
      setEmailSent(false)
      router.refresh()
    }
    setIsLoading(false)
  }

  const handlePrint = () => {
    // Navigate to print page with details
    const resident = residents.find(res => res.id === selectedResidentId)
    if (!resident) return

    const params = new URLSearchParams({
      email,
      tempPassword: password,
      firstName: resident.first_name,
      lastName: resident.last_name,
      residentType: selectedResidentType,
      block: property.block,
      lot: property.lot,
    })

    window.open(`/print/credentials/${selectedResidentId}?${params.toString()}`, '_blank')
  }

  const handleSendEmail = async () => {
    const resident = residents.find(res => res.id === selectedResidentId)
    if (!resident) return

    setEmailLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('residentId', selectedResidentId)
    formData.append('residentType', selectedResidentType)
    formData.append('propertyId', property.id)
    formData.append('firstName', resident.first_name)
    formData.append('lastName', resident.last_name)

    const result = await sendCredentialEmail(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setEmailSent(true)
    }
    setEmailLoading(false)
  }

  const generateRandomPassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
    let newPassword = ''
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(newPassword)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={triggerVariant || (isAlreadyLinked ? "outline" : "default")} 
          size="sm" 
          className={cn("h-10 font-bold shadow-sm uppercase tracking-wide", !triggerLabel && !className && "w-full", className)}
        >
          {triggerLabel ? (
            triggerLabel
          ) : (
            <>
              {isAlreadyLinked ? (
                <>
                  <Key className="mr-2 size-4" />
                  Reset & Reprint Access Guide
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" />
                  Setup Portal Access
                </>
              )}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Resident Portal Credentials</DialogTitle>
          <DialogDescription>
            Create login credentials for a resident associated with this property.
            This will allow them to access the Resident Portal.
          </DialogDescription>
        </DialogHeader>

        {linkedUsers.length > 0 && !preselectedResidentId && (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Linked Portal Users:</p>
            <ul className="list-disc pl-5">
              {linkedUsers.map((user) => (
                <li key={user.id}>
                  {user.email} (Linked to{' '}
                  {
                    residents.find((res: any) => res.user_id === user.id)
                      ?.first_name
                  }{' '}
                  {
                    residents.find((res: any) => res.user_id === user.id)
                      ?.last_name
                  }
                  )
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleGenerate} className="grid gap-4 py-4">
          {!preselectedResidentId && (
            <div className="grid gap-2">
              <Label htmlFor="resident">Select Resident</Label>
              <Select
                value={selectedResidentId}
                onValueChange={(value) => {
                  setSelectedResidentId(value)
                  const resident = unlinkedResidents.find(
                    (res: any) => res.id === value,
                  )
                  setSelectedResidentType(
                    resident 
                      ? (resident.resident_type || (property.homeowners?.some((h: any) => h.id === resident.id) ? 'homeowner' : 'renter'))
                      : ''
                  )
                  setEmail(resident?.email || '')
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an unlinked resident" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedResidents.length === 0 && (
                    <SelectItem value="no-residents" disabled>
                      No unlinked residents
                    </SelectItem>
                  )}
                  {unlinkedResidents.map((res: any) => (
                    <SelectItem key={res.id} value={res.id}>
                      {res.first_name} {res.last_name} ({res.resident_type || (property.homeowners?.some((h: any) => h.id === res.id) ? 'homeowner' : 'renter')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="resident@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!selectedResidentId} 
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={generateRandomPassword}
                className="h-auto px-0 text-xs"
              >
                <Key className="mr-1 size-3" /> Generate Random
              </Button>
            </div>
            <Input
              id="password"
              type="text"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              readOnly={isLoading}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2">
              <p className="text-green-700 text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="size-4" /> {success}
              </p>
              {emailSent ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Mail className="size-3" /> Credentials emailed to {email}
                </p>
              ) : (
                <p className="text-xs text-green-600">
                  You can now print or email the access instructions for the resident.
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={emailLoading}
                  onClick={handleSendEmail}
                  className="flex-1 bg-white border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 font-bold h-9"
                >
                  {emailLoading ? (
                    <Loader2 className="mr-2 size-3 animate-spin" />
                  ) : (
                    <Mail className="mr-2 size-3" />
                  )}
                  {emailSent ? 'Resend Email' : 'Email Credentials'}
                </Button>
                <Button 
                  asChild
                  variant="outline" 
                  size="sm"
                  className="flex-1 bg-white border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 font-bold h-9"
                >
                  <Link 
                    href={`/print/credentials/${selectedResidentId || preselectedResidentId}?${new URLSearchParams({
                      email,
                      tempPassword: password,
                      firstName: residents.find(res => res.id === (selectedResidentId || preselectedResidentId))?.first_name || 'Resident',
                      lastName: residents.find(res => res.id === (selectedResidentId || preselectedResidentId))?.last_name || '',
                      residentType: selectedResidentType || preselectedResidentType || 'homeowner',
                      block: property.block,
                      lot: property.lot,
                    }).toString()}`}
                    target="_blank"
                  >
                    <Printer className="mr-2 size-3" />
                    Print
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            {!success ? (
              <Button type="submit" disabled={isLoading || (!selectedResidentId && !preselectedResidentId)} className="w-full h-10 font-bold uppercase tracking-wide">
                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isAlreadyLinked ? 'Reset & Reprint Access' : 'Generate Credentials'}
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full h-10 font-medium"
                onClick={() => {
                  setIsOpen(false)
                  setSuccess(null)
                  setEmailSent(false)
                  setEmail('')
                  setPassword('')
                }}
              >
                Close Dialog
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
