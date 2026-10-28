'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Hammer, Landmark, CircleAlert, CheckCircle2, UserCheck, XCircle } from 'lucide-react'
import { approvePermitAction, rejectPermitAction, completePermitAndRefundAction } from '@/lib/actions/permits'

interface PermitsClientProps {
  permits: any[]
  bankAccounts: any[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  approved: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

const typeLabels: Record<string, string> = {
  renovation: 'Renovation',
  new_construction: 'New Construction',
  demolition: 'Demolition',
  other: 'Other',
}

export function PermitsClient({ permits, bankAccounts }: PermitsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState('all')

  // Dialog States
  const [approveOpen, setApproveOpen] = useState(false)
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null)
  const [permitFee, setPermitFee] = useState('1000')
  const [bondAmount, setBondAmount] = useState('5000')

  const [refundOpen, setRefundOpen] = useState(false)
  const [bankAccountId, setBankAccountId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('check')
  const [refNo, setRefNo] = useState('')
  const [refundNotes, setRefundNotes] = useState('')

  // Filtered Permits
  const filteredPermits = permits.filter((p) => {
    if (filter === 'all') return true
    return p.status === filter
  })

  // KPI Calculations
  const pendingCount = permits.filter((p) => p.status === 'pending').length
  const activeCount = permits.filter((p) => p.status === 'approved').length
  const totalBondHeld = permits
    .filter((p) => p.status === 'approved' && p.bond_amount > 0)
    .reduce((sum, p) => sum + Number(p.bond_amount), 0)

  const handleApproveSubmit = () => {
    if (!selectedPermitId) return
    const fee = parseFloat(permitFee)
    const bond = parseFloat(bondAmount)

    if (isNaN(fee) || fee < 0 || isNaN(bond) || bond < 0) {
      toast.error('Please enter valid numeric amounts.')
      return
    }

    startTransition(async () => {
      try {
        await approvePermitAction(selectedPermitId, fee, bond)
        toast.success('Permit approved and invoices generated successfully.')
        setApproveOpen(false)
      } catch (err: any) {
        toast.error(`Approval failed: ${err.message}`)
      }
    })
  }

  const handleReject = (id: string) => {
    if (!confirm('Are you sure you want to reject this permit application?')) return
    startTransition(async () => {
      try {
        await rejectPermitAction(id)
        toast.success('Permit application rejected.')
      } catch (err: any) {
        toast.error(`Error rejecting permit: ${err.message}`)
      }
    })
  }

  const handleRefundSubmit = () => {
    if (!selectedPermitId) return
    if (!bankAccountId) {
      toast.error('Please select a bank account to release the bond.')
      return
    }

    startTransition(async () => {
      try {
        await completePermitAndRefundAction(
          selectedPermitId,
          bankAccountId,
          paymentMethod,
          refNo,
          refundNotes
        )
        toast.success('Permit completed and refundable construction bond released.')
        setRefundOpen(false)
      } catch (err: any) {
        toast.error(`Refund failed: ${err.message}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Pending Applications
            </CardTitle>
            <CircleAlert className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-amber-600">
            {pendingCount}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Active Construction Projects
            </CardTitle>
            <Hammer className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-primary">
            {activeCount}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Total Bond Deposits Held
            </CardTitle>
            <Landmark className="size-4 text-green-600" />
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-green-600">
            ₱{totalBondHeld.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <div className="bg-white rounded-lg border border-muted/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-muted/60 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('approved')}
            >
              Approved
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Completed
            </Button>
          </div>
        </div>

        <Table suppressHydrationWarning>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Applicant Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead className="text-right">Permit Fee</TableHead>
              <TableHead className="text-right">Bond Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPermits.map((permit) => {
              const prop = Array.isArray(permit.property) ? permit.property[0] : permit.property
              return (
                <TableRow key={permit.id}>
                  <TableCell className="font-semibold text-slate-800">
                    {prop ? `Block ${prop.block} Lot ${prop.lot}` : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{permit.applicant_name}</TableCell>
                  <TableCell>{typeLabels[permit.permit_type] || permit.permit_type}</TableCell>
                  <TableCell className="text-xs">
                    {permit.start_date} to {permit.estimated_end_date}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    ₱{Number(permit.permit_fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    ₱{Number(permit.bond_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${statusColors[permit.status]} uppercase text-[10px] font-bold`}>
                      {permit.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {permit.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPermitId(permit.id)
                              setApproveOpen(true)
                            }}
                          >
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(permit.id)}>
                            Reject
                          </Button>
                        </>
                      )}
                      {permit.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPermitId(permit.id)
                            setRefundNotes(`Refund of construction bond to ${permit.applicant_name} for property B${prop?.block}L${prop?.lot}`)
                            setRefundOpen(true)
                          }}
                        >
                          Complete & Refund
                        </Button>
                      )}
                      {permit.status === 'completed' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-green-600" /> Refunded
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredPermits.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground italic py-8">
                  No permits found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Permit Application</DialogTitle>
            <DialogDescription>
              Review the permit details, set construction permit fees, and refundable construction bond amount. An invoice will be automatically generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="permitFee">Permit Processing Fee (PHP)</Label>
              <Input
                id="permitFee"
                type="number"
                value={permitFee}
                onChange={(e) => setPermitFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bondAmount">Refundable Construction Bond (PHP)</Label>
              <Input
                id="bondAmount"
                type="number"
                value={bondAmount}
                onChange={(e) => setBondAmount(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleApproveSubmit} disabled={isPending}>
              Approve & Generate Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund & Complete Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Construction & Release Bond</DialogTitle>
            <DialogDescription>
              Record the inspection completion and process the refundable bond repayment. This logs a disbursement in the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank">Source Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acct) => (
                    <SelectItem key={acct.id} value={acct.id}>
                      {acct.bank_name} - {acct.name} ({acct.account_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Repayment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refNo">Reference / Check Number</Label>
              <Input
                id="refNo"
                placeholder="e.g. Check #129312 or Txn ID"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Explanation</Label>
              <Input
                id="notes"
                placeholder="Refund notes"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleRefundSubmit} disabled={isPending}>
              Confirm Refund & Complete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
