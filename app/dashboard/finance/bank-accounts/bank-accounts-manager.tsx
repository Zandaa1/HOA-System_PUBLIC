'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Loader2, Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { ColumnDef } from '@tanstack/react-table'
import { BankAccount } from '@/lib/types/database'

const ACCOUNT_TYPES = [
  { value: 'current', label: 'Current' },
  { value: 'savings', label: 'Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'petty_cash', label: 'Petty Cash' },
] as const

interface BankAccountsManagerProps {
  initialAccounts: BankAccount[]
}

function AccountForm({
  account,
  onClose,
}: {
  account?: BankAccount | null
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const [form, setForm] = useState({
    name: account?.name || '',
    account_number: account?.account_number || '',
    bank_name: account?.bank_name || '',
    type: account?.type || 'current',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (account) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(form)
          .eq('id', account.id)
        if (error) throw error
        toast.success('Bank account updated')
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert(form)
        if (error) throw error
        toast.success('Bank account created')
      }
      onClose()
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Account Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. BPI, CBC, Cash on Hand"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bank_name">Bank Name</Label>
          <Input
            id="bank_name"
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            placeholder="e.g. Bank of the Philippine Islands"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_number">Account Number</Label>
          <Input
            id="account_number"
            value={form.account_number}
            onChange={(e) => setForm({ ...form, account_number: e.target.value })}
            placeholder="e.g. 1953-1311-09"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Account Type *</Label>
        <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val as any })}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {account ? 'Update' : 'Create'} Account
        </Button>
      </div>
    </form>
  )
}

export function BankAccountsManager({ initialAccounts }: BankAccountsManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
      if (error) throw error
      toast.success('Bank account deleted')
      setAccounts(accounts.filter((a) => a.id !== id))
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(null)
    }
  }

  const columns: ColumnDef<BankAccount>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    )},
    { accessorKey: 'bank_name', header: 'Bank' },
    { accessorKey: 'account_number', header: 'Account No.' },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => (
      <Badge variant="outline" className="text-xs capitalize">{row.original.type.replace('_', ' ')}</Badge>
    )},
    { id: 'actions', cell: ({ row }) => (
      <div className="flex gap-1 justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Pencil className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Bank Account</AlertDialogTitle>
              <AlertDialogDescription>Update account details.</AlertDialogDescription>
            </AlertDialogHeader>
            <AccountForm account={row.original} onClose={() => setEditing(null)} />
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          disabled={deleting === row.original.id}
          onClick={() => {
            if (confirm('Delete this bank account?')) handleDelete(row.original.id)
          }}
        >
          {deleting === row.original.id ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AlertDialog open={showCreate} onOpenChange={setShowCreate}>
          <AlertDialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 size-4" />Add Bank Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>New Bank Account</AlertDialogTitle>
              <AlertDialogDescription>Add a new bank account for cash flow tracking.</AlertDialogDescription>
            </AlertDialogHeader>
            <AccountForm onClose={() => setShowCreate(false)} />
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <DataTable
        columns={columns}
        data={accounts}
        searchKey="name"
        searchPlaceholder="Search accounts..."
        emptyTitle="No bank accounts"
        emptyDescription="Add your first bank account to start tracking cash flow."
      />
    </div>
  )
}
