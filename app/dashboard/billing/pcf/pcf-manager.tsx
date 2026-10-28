'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Plus,
  Landmark,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  DollarSign
} from 'lucide-react'
import { BankAccount, CashAdvance, PCFReplenishment, SystemSetting } from '@/lib/types/database'

interface PCFManagerProps {
  pcfAccount: BankAccount | null
  pcfBalance: number
  custodianAdvances: CashAdvance[]
  replenishments: PCFReplenishment[]
  mainAccounts: BankAccount[]
  settings?: SystemSetting[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  approved: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  released: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  rejected: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
}

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

export function PCFManager({
  pcfAccount,
  pcfBalance,
  custodianAdvances,
  replenishments,
  mainAccounts,
  settings,
}: PCFManagerProps) {
  const router = useRouter()

  const settingsMap = (settings || []).reduce(
    (acc, s) => ({ ...acc, [s.setting_key]: s.setting_value || '' }),
    {} as Record<string, string>
  )
  const custodianName = settingsMap['pcf_custodian_name'] || 'Ms. Tess'
  const [isPending, startTransition] = useTransition()
  const [replenishOpen, setReplenishOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    source_bank_account_id: '',
    amount: '',
    notes: '',
  })

  const handleReplenishSubmit = () => {
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount to replenish.')
      return
    }
    if (!form.source_bank_account_id) {
      setError('Please select a source bank account.')
      return
    }
    if (!pcfAccount) {
      setError('No active Petty Cash Fund account found in the database.')
      return
    }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const now = new Date()

      try {
        // 1. Create a matching fund transfer disbursement (this represents the outflow from the main bank)
        const vouchNum = `REPL-${Date.now()}`
        const { data: disb, error: disbErr } = await supabase
          .from('disbursements')
          .insert({
            disbursement_number: vouchNum,
            category: 'transfer',
            amount,
            payment_date: now.toISOString().split('T')[0],
            payment_method: 'Bank Transfer',
            payee: 'Petty Cash Replenishment',
            notes: `Replenishment of PCF fund. Reference: ${form.notes || 'N/A'}`,
            bank_account_id: form.source_bank_account_id,
            is_fund_transfer: true,
            period_month: now.getMonth() + 1,
            period_year: now.getFullYear(),
          })
          .select('id')
          .single()

        if (disbErr || !disb) throw disbErr || new Error('Failed to create replenishment disbursement.')

        // 2. Insert into pcf_replenishments table
        const { error: replErr } = await supabase
          .from('pcf_replenishments')
          .insert({
            pcf_bank_account_id: pcfAccount.id,
            source_bank_account_id: form.source_bank_account_id,
            requested_amount: amount,
            approved_amount: amount,
            status: 'released',
            disbursement_id: disb.id,
            released_at: now.toISOString(),
            approved_at: now.toISOString(),
            approved_by: 'HOA Treasurer',
            notes: form.notes.trim() || null,
          })

        if (replErr) throw replErr

        // 3. Update the ending balance in bank_balances for the current period (optionally)
        const { data: activeBalance } = await supabase
          .from('bank_balances')
          .select('*')
          .eq('bank_account_id', pcfAccount.id)
          .eq('period_month', now.getMonth() + 1)
          .eq('period_year', now.getFullYear())
          .single()

        if (activeBalance) {
          await supabase
            .from('bank_balances')
            .update({
              ending_balance: Number(activeBalance.ending_balance) + amount,
            })
            .eq('id', activeBalance.id)
        } else {
          // If no balance record exists for this month, insert it
          await supabase.from('bank_balances').insert({
            bank_account_id: pcfAccount.id,
            period_month: now.getMonth() + 1,
            period_year: now.getFullYear(),
            beginning_balance: pcfBalance,
            ending_balance: pcfBalance + amount,
          })
        }

        // Subtract from source account balance too
        const { data: sourceBalance } = await supabase
          .from('bank_balances')
          .select('*')
          .eq('bank_account_id', form.source_bank_account_id)
          .eq('period_month', now.getMonth() + 1)
          .eq('period_year', now.getFullYear())
          .single()

        if (sourceBalance) {
          await supabase
            .from('bank_balances')
            .update({
              ending_balance: Number(sourceBalance.ending_balance) - amount,
            })
            .eq('id', sourceBalance.id)
        }

        setReplenishOpen(false)
        setForm({ source_bank_account_id: '', amount: '', notes: '' })
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'An error occurred during PCF replenishment.')
      }
    })
  }

  const totals = {
    openCustodianAmt: custodianAdvances.reduce((s, a) => s + Number(a.outstanding_balance), 0),
    totalReplenished: replenishments.reduce((s, r) => s + Number(r.approved_amount || r.requested_amount), 0),
  }

  return (
    <div className="space-y-6">
      {/* PCF Top Header Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm border-muted/60 bg-status-paid-bg/10">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current PCF Balance</p>
              <p className="text-2xl font-bold font-mono text-emerald-600">{fmt(pcfBalance)}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Account: {pcfAccount?.name || 'Cash on Hand'}</p>
            </div>
            <PiggyBank className="size-8 text-emerald-600/30" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Custodian Advances</p>
              <p className="text-2xl font-bold font-mono text-amber-600">{fmt(totals.openCustodianAmt)}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{custodianAdvances.length} active custodian grants</p>
            </div>
            <DollarSign className="size-8 text-amber-600/30" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Replenishments (YTD)</p>
              <p className="text-2xl font-bold font-mono text-indigo-600">{fmt(totals.totalReplenished)}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{replenishments.length} replenishment requests</p>
            </div>
            <Landmark className="size-8 text-indigo-600/30" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 max-w-6xl">
        {/* Custodian Active Advances List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Custodian Active Advances</CardTitle>
                <CardDescription className="text-xs">PCF drawdowns held by the fund custodian</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/billing/cash-advances/new">
                  <Plus className="mr-2 size-3.5" />New Drawdown
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {custodianAdvances.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">No active Petty Cash advances recorded.</p>
              ) : (
                <div className="divide-y">
                  {custodianAdvances.map((adv) => (
                    <div key={adv.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <Link href={`/dashboard/billing/cash-advances/${adv.id}`} className="font-bold text-primary hover:underline font-mono text-sm">
                          {adv.reference_number}
                        </Link>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          Custodian: {adv.grantee_name} · Purpose: {adv.purpose}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-amber-600 text-sm">{fmt(Number(adv.outstanding_balance))}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Due: {adv.due_liquidation_date ? new Date(adv.due_liquidation_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PCF Replenishment Log */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Replenishment History</CardTitle>
                <CardDescription className="text-xs">Replenishments drawn from BPI/CBC into Petty Cash</CardDescription>
              </div>
              <Button onClick={() => setReplenishOpen(true)} size="sm">
                <Plus className="mr-2 size-3.5" />Replenish PCF
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {replenishments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">No replenishments logged yet.</p>
              ) : (
                <div className="divide-y">
                  {replenishments.map((repl) => (
                    <div key={repl.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Petty Cash Replenishment</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                          Source: {(repl.source_bank_account as any)?.name || 'Main Bank'} · Ref: {repl.notes || 'None'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-indigo-600 text-sm">
                          {fmt(Number(repl.approved_amount || repl.requested_amount))}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {repl.released_at ? new Date(repl.released_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Custodian Mapping Settings */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Custodian Configuration</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs font-semibold">
              <div className="flex gap-3">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  <p className="text-slate-800">Custodian Custody</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{custodianName} (Treasurer / Clerk)</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  <p className="text-slate-800">Primary Replenish Source</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Chinabank (CBC CA)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* REPLENISH PCF DIALOG */}
      <Dialog open={replenishOpen} onOpenChange={setReplenishOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replenish Petty Cash Fund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="source_bank">Source Main Bank Account *</Label>
              <Select
                value={form.source_bank_account_id}
                onValueChange={(val) => setForm({ ...form, source_bank_account_id: val })}
              >
                <SelectTrigger id="source_bank" className="h-10">
                  <SelectValue placeholder="Select main bank..." />
                </SelectTrigger>
                <SelectContent>
                  {mainAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="repl_amount">Replenish Amount (₱) *</Label>
              <Input
                id="repl_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="font-mono font-bold h-10 text-indigo-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="repl_notes">Reference Number / Notes</Label>
              <Textarea
                id="repl_notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Check reference, memo notes..."
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm font-semibold bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button onClick={handleReplenishSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Replenish
            </Button>
            <Button variant="outline" onClick={() => setReplenishOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
