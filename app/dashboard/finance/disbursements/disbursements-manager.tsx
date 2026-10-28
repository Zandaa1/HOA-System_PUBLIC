'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2, ArrowUpRight, ArrowDownRight, Wallet, ArrowRightLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { BankAccount } from '@/lib/types/database'

interface Disbursement {
  id: string
  disbursement_number: string | null
  category: string
  amount: number
  payment_date: string
  payment_method: string
  bank_account_id: string
  payee: string
  reference_number: string | null
  notes: string | null
  created_at: string
  bank_account?: BankAccount | null
}

interface NonInvoiceCollection {
  id: string
  receipt_number: string | null
  category: string
  amount: number
  payment_date: string
  payment_method: string
  bank_account_id: string
  notes: string | null
  created_at: string
  bank_account?: BankAccount | null
}

interface AccountTransfer {
  id: string
  transfer_number: string | null
  source_bank_account_id: string
  destination_bank_account_id: string
  amount: number
  transfer_date: string
  reference_number: string | null
  notes: string | null
  created_at: string
}

interface DisbursementsManagerProps {
  initialDisbursements: Disbursement[]
  initialNonInvoiceCollections: NonInvoiceCollection[]
  initialAccountTransfers: AccountTransfer[]
  bankAccounts: BankAccount[]
}

const DISBURSEMENT_CATEGORIES = [
  'utility', 'salary', 'repairs', 'security', 'supplies',
  'legal', 'refund_bond', 'others',
] as const

const DISBURSEMENT_LABELS: Record<string, string> = {
  utility: 'Utility',
  salary: 'Salary & Other Benefits',
  repairs: 'Repairs & Maintenance',
  security: 'Security',
  supplies: 'Supplies',
  legal: 'Legal',
  refund_bond: 'Refund of Construction Bond',
  transfer: 'Transfer',
  others: 'Others',
}

const NON_INVOICE_CATEGORIES = ['Bank Interest', 'Other']

export function DisbursementsManager({
  initialDisbursements,
  initialNonInvoiceCollections,
  initialAccountTransfers,
  bankAccounts,
}: DisbursementsManagerProps) {
  const router = useRouter()
  const supabase = createClient()

  const [disbursements, setDisbursements] = useState<Disbursement[]>(initialDisbursements)
  const [nonInvoiceCollections, setNonInvoiceCollections] = useState<NonInvoiceCollection[]>(initialNonInvoiceCollections)
  const [accountTransfers, setAccountTransfers] = useState<AccountTransfer[]>(initialAccountTransfers)

  const [isDisbursing, setIsDisbursing] = useState(false)
  const [isDeletingDisbursement, setIsDeletingDisbursement] = useState<string | null>(null)
  const [isCollecting, setIsCollecting] = useState(false)
  const [isDeletingCollection, setIsDeletingCollection] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [isDeletingTransfer, setIsDeletingTransfer] = useState<string | null>(null)

  const [dispForm, setDispForm] = useState({
    disbursement_number: '',
    category: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    bank_account_id: bankAccounts[0]?.id || '',
    payee: '',
    reference_number: '',
    notes: '',
  })

  const [collForm, setCollForm] = useState({
    receipt_number: '',
    category: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    bank_account_id: '',
    notes: '',
  })

  const [transferForm, setTransferForm] = useState({
    transfer_number: '',
    source_bank_account_id: '',
    destination_bank_account_id: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  })

  const handleDisbursementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispForm.category) {
      toast.error('Please select a category')
      return
    }
    if (!dispForm.bank_account_id) {
      toast.error('Please select a bank account')
      return
    }

    setIsDisbursing(true)
    try {
      const paymentDate = new Date(dispForm.payment_date)
      const { data: newDisp, error } = await supabase
        .from('disbursements')
        .insert({
          disbursement_number: dispForm.disbursement_number || null,
          category: dispForm.category,
          amount: parseFloat(dispForm.amount),
          payment_date: dispForm.payment_date,
          payment_method: dispForm.payment_method,
          bank_account_id: dispForm.bank_account_id,
          payee: dispForm.payee,
          reference_number: dispForm.reference_number || null,
          notes: dispForm.notes || null,
          period_month: paymentDate.getMonth() + 1,
          period_year: paymentDate.getFullYear(),
        })
        .select('*, bank_account:bank_accounts(*)')
        .single()

      if (error) throw error

      toast.success('Disbursement recorded successfully')
      setDisbursements([newDisp as any, ...disbursements])
      setDispForm({
        disbursement_number: '',
        category: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        bank_account_id: bankAccounts[0]?.id || '',
        payee: '',
        reference_number: '',
        notes: '',
      })
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDisbursing(false)
    }
  }

  const handleDeleteDisbursement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disbursement?')) return
    setIsDeletingDisbursement(id)
    try {
      const { error } = await supabase.from('disbursements').delete().eq('id', id)
      if (error) throw error
      toast.success('Disbursement deleted successfully')
      setDisbursements(disbursements.filter(d => d.id !== id))
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeletingDisbursement(null)
    }
  }

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collForm.category) {
      toast.error('Please select a category')
      return
    }
    if (!collForm.bank_account_id) {
      toast.error('Please select a deposit account')
      return
    }
    if (!collForm.payment_method) {
      toast.error('Please select a payment method')
      return
    }
    setIsCollecting(true)
    try {
      const { data: newColl, error } = await supabase
        .from('non_invoice_collections')
        .insert({
          receipt_number: collForm.receipt_number || null,
          category: collForm.category,
          amount: parseFloat(collForm.amount),
          payment_date: collForm.payment_date,
          payment_method: collForm.payment_method,
          bank_account_id: collForm.bank_account_id,
          notes: collForm.notes || null,
        })
        .select('*, bank_account:bank_accounts(*)')
        .single()

      if (error) throw error

      toast.success('Non-invoice collection recorded successfully')
      setNonInvoiceCollections([newColl as any, ...nonInvoiceCollections])
      setCollForm({
        receipt_number: '',
        category: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        bank_account_id: '',
        notes: '',
      })
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsCollecting(false)
    }
  }

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return
    setIsDeletingCollection(id)
    try {
      const { error } = await supabase.from('non_invoice_collections').delete().eq('id', id)
      if (error) throw error
      toast.success('Collection deleted successfully')
      setNonInvoiceCollections(nonInvoiceCollections.filter(c => c.id !== id))
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeletingCollection(null)
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferForm.source_bank_account_id || !transferForm.destination_bank_account_id) {
      toast.error('Please select source and destination accounts')
      return
    }
    if (transferForm.source_bank_account_id === transferForm.destination_bank_account_id) {
      toast.error('Source and destination accounts must be different')
      return
    }

    setIsTransferring(true)
    try {
      const { data: newTransfer, error } = await supabase
        .from('account_transfers')
        .insert({
          transfer_number: transferForm.transfer_number || null,
          source_bank_account_id: transferForm.source_bank_account_id,
          destination_bank_account_id: transferForm.destination_bank_account_id,
          amount: parseFloat(transferForm.amount),
          transfer_date: transferForm.transfer_date,
          reference_number: transferForm.reference_number || null,
          notes: transferForm.notes || null,
        })
        .select('*')
        .single()

      if (error) throw error

      toast.success('Account transfer recorded successfully')
      setAccountTransfers([newTransfer as AccountTransfer, ...accountTransfers])
      setTransferForm({
        transfer_number: '',
        source_bank_account_id: '',
        destination_bank_account_id: '',
        amount: '',
        transfer_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
      })
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsTransferring(false)
    }
  }

  const handleDeleteTransfer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transfer?')) return
    setIsDeletingTransfer(id)
    try {
      const { error } = await supabase.from('account_transfers').delete().eq('id', id)
      if (error) throw error
      toast.success('Transfer deleted successfully')
      setAccountTransfers(accountTransfers.filter(t => t.id !== id))
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeletingTransfer(null)
    }
  }

  const fmtCurrency = (n: number) =>
    `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const bankName = (id: string) => bankAccounts.find(b => b.id === id)?.name || 'Unknown'

  return (
    <Tabs defaultValue="disbursements" className="space-y-6">
      <TabsList className="bg-muted/80 p-1 rounded-lg border w-full flex h-auto md:w-max">
        <TabsTrigger value="disbursements" className="text-xs py-2 px-4 font-medium flex items-center gap-1.5">
          <ArrowDownRight className="size-4 text-rose-500" />
          Disbursements (Expenses)
        </TabsTrigger>
        <TabsTrigger value="collections" className="text-xs py-2 px-4 font-medium flex items-center gap-1.5">
          <ArrowUpRight className="size-4 text-emerald-500" />
          Non-Invoice Income (Miscellaneous)
        </TabsTrigger>
        <TabsTrigger value="transfers" className="text-xs py-2 px-4 font-medium flex items-center gap-1.5">
          <ArrowRightLeft className="size-4 text-blue-500" />
          Account Transfers
        </TabsTrigger>
      </TabsList>

      <TabsContent value="disbursements" className="outline-none">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="size-4 text-rose-500" />
                Record Disbursement
              </CardTitle>
              <CardDescription>Log cash outflows for operations, salaries, and refunds.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDisbursementSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payee">Payee *</Label>
                  <Input
                    id="payee"
                    placeholder="e.g. Meralco, Staff Name, Contractor"
                    value={dispForm.payee}
                    onChange={(e) => setDispForm({ ...dispForm, payee: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="disp-amount">Amount (₱) *</Label>
                    <Input
                      id="disp-amount"
                      type="number" step="0.01" placeholder="0.00"
                      value={dispForm.amount}
                      onChange={(e) => setDispForm({ ...dispForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disp-date">Payment Date *</Label>
                    <Input
                      id="disp-date" type="date"
                      value={dispForm.payment_date}
                      onChange={(e) => setDispForm({ ...dispForm, payment_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="disp-category">Category *</Label>
                    <Select
                      value={dispForm.category}
                      onValueChange={(val) => setDispForm({ ...dispForm, category: val })}
                    >
                      <SelectTrigger id="disp-category">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISBURSEMENT_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {DISBURSEMENT_LABELS[cat] || cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disp-bank">Bank Account *</Label>
                    <Select
                      value={dispForm.bank_account_id}
                      onValueChange={(val) => setDispForm({ ...dispForm, bank_account_id: val })}
                    >
                      <SelectTrigger id="disp-bank">
                        <SelectValue placeholder="Select Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="disbursement_number">Voucher / Check #</Label>
                    <Input
                      id="disbursement_number"
                      placeholder="e.g. V-001, CK-123"
                      value={dispForm.disbursement_number}
                      onChange={(e) => setDispForm({ ...dispForm, disbursement_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disp-method">Method *</Label>
                    <Select
                      value={dispForm.payment_method}
                      onValueChange={(val) => setDispForm({ ...dispForm, payment_method: val })}
                    >
                      <SelectTrigger id="disp-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Reference code or invoice number"
                    value={dispForm.reference_number}
                    onChange={(e) => setDispForm({ ...dispForm, reference_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add breakdown or details..."
                    value={dispForm.notes}
                    onChange={(e) => setDispForm({ ...dispForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button type="submit" disabled={isDisbursing} className="w-full bg-status-overdue hover:bg-status-overdue/90">
                  {isDisbursing ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</>
                  ) : (
                    <><Plus className="mr-2 size-4" />Record Disbursement</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Outflow Log</CardTitle>
              <CardDescription>Recent recorded expenditures and refunds.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card overflow-hidden">
                <Table suppressHydrationWarning>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher / Date</TableHead>
                      <TableHead>Payee / Notes</TableHead>
                      <TableHead>Category / Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disbursements.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {d.disbursement_number || 'N/A'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(d.payment_date).toLocaleDateString('en-PH', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{d.payee}</span>
                            {d.notes && <span className="text-xs text-muted-foreground line-clamp-1">{d.notes}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-700 capitalize">
                              {DISBURSEMENT_LABELS[d.category] || d.category}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {d.bank_account?.name || 'Unknown'} ({d.payment_method})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600 font-mono">
                          {fmtCurrency(d.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeletingDisbursement === d.id}
                            onClick={() => handleDeleteDisbursement(d.id)}
                          >
                            {isDeletingDisbursement === d.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {disbursements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                          No disbursements logged yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="collections" className="outline-none">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="size-4 text-emerald-500" />
                Record Miscellaneous Income
              </CardTitle>
              <CardDescription>Log interest accrued or other non-invoice cash inflows.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCollectionSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="coll-amount">Amount (₱) *</Label>
                    <Input
                      id="coll-amount" type="number" step="0.01" placeholder="0.00"
                      value={collForm.amount}
                      onChange={(e) => setCollForm({ ...collForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coll-date">Date *</Label>
                    <Input
                      id="coll-date" type="date"
                      value={collForm.payment_date}
                      onChange={(e) => setCollForm({ ...collForm, payment_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="coll-category">Category *</Label>
                    <Select
                      value={collForm.category}
                      onValueChange={(val) => setCollForm({ ...collForm, category: val })}
                    >
                      <SelectTrigger id="coll-category">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {NON_INVOICE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coll-account">Deposit Account *</Label>
                    <Select
                      value={collForm.bank_account_id}
                      onValueChange={(val) => setCollForm({ ...collForm, bank_account_id: val })}
                    >
                      <SelectTrigger id="coll-account">
                        <SelectValue placeholder="Select Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="receipt_number">Receipt Number</Label>
                    <Input
                      id="receipt_number" placeholder="e.g. OR-9988"
                      value={collForm.receipt_number}
                      onChange={(e) => setCollForm({ ...collForm, receipt_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coll-method">Method *</Label>
                    <Select
                      value={collForm.payment_method}
                      onValueChange={(val) => setCollForm({ ...collForm, payment_method: val })}
                    >
                      <SelectTrigger id="coll-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="GCash">GCash</SelectItem>
                        <SelectItem value="Maya">Maya</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Description or details about this non-invoice cash inflow..."
                    value={collForm.notes}
                    onChange={(e) => setCollForm({ ...collForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={isCollecting} className="w-full bg-status-paid hover:bg-status-paid/90">
                  {isCollecting ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</>
                  ) : (
                    <><Plus className="mr-2 size-4" />Record Income</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Inflow Log</CardTitle>
              <CardDescription>Miscellaneous income logs such as bank interest and other receipts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card overflow-hidden">
                <Table suppressHydrationWarning>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt / Date</TableHead>
                      <TableHead>Category / Notes</TableHead>
                      <TableHead>Account / Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonInvoiceCollections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {c.receipt_number || 'N/A'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.payment_date).toLocaleDateString('en-PH', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{c.category}</span>
                            {c.notes && <span className="text-xs text-muted-foreground line-clamp-1">{c.notes}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700">{c.bank_account?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{c.payment_method}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 font-mono">
                          {fmtCurrency(c.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeletingCollection === c.id}
                            onClick={() => handleDeleteCollection(c.id)}
                          >
                            {isDeletingCollection === c.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {nonInvoiceCollections.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                          No miscellaneous income logged yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="transfers" className="outline-none">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-blue-500" />
                Record Transfer
              </CardTitle>
              <CardDescription>Move funds between bank or cash accounts without recording income.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-amount">Amount (₱) *</Label>
                    <Input
                      id="transfer-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-date">Date *</Label>
                    <Input
                      id="transfer-date"
                      type="date"
                      value={transferForm.transfer_date}
                      onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-source">Source Account *</Label>
                  <Select
                    value={transferForm.source_bank_account_id}
                    onValueChange={(val) => setTransferForm({ ...transferForm, source_bank_account_id: val })}
                  >
                    <SelectTrigger id="transfer-source">
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-destination">Destination Account *</Label>
                  <Select
                    value={transferForm.destination_bank_account_id}
                    onValueChange={(val) => setTransferForm({ ...transferForm, destination_bank_account_id: val })}
                  >
                    <SelectTrigger id="transfer-destination">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-number">Transfer Number</Label>
                    <Input
                      id="transfer-number"
                      placeholder="e.g. TR-001"
                      value={transferForm.transfer_number}
                      onChange={(e) => setTransferForm({ ...transferForm, transfer_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-reference">Reference</Label>
                    <Input
                      id="transfer-reference"
                      placeholder="Bank reference"
                      value={transferForm.reference_number}
                      onChange={(e) => setTransferForm({ ...transferForm, reference_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Transfer details..."
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={isTransferring} className="w-full bg-blue-600 hover:bg-blue-700">
                  {isTransferring ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</>
                  ) : (
                    <><Plus className="mr-2 size-4" />Record Transfer</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Transfer Log</CardTitle>
              <CardDescription>Inter-account fund movements excluded from income totals.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card overflow-hidden">
                <Table suppressHydrationWarning>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer / Date</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Reference / Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountTransfers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {t.transfer_number || 'N/A'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(t.transfer_date).toLocaleDateString('en-PH', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-slate-700">{bankName(t.source_bank_account_id)}</span>
                            <span className="text-muted-foreground">to {bankName(t.destination_bank_account_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-mono text-slate-700">{t.reference_number || '-'}</span>
                            {t.notes && <span className="text-xs text-muted-foreground line-clamp-1">{t.notes}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600 font-mono">
                          {fmtCurrency(t.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeletingTransfer === t.id}
                            onClick={() => handleDeleteTransfer(t.id)}
                          >
                            {isDeletingTransfer === t.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {accountTransfers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                          No account transfers logged yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
