'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteBillingPeriod } from '@/lib/actions/generate-billing-periods'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

interface DeletePeriodButtonProps {
  periodId: string
  periodName: string
}

export function DeletePeriodButton({ periodId, periodName }: DeletePeriodButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteBillingPeriod(periodId)
        if (res.success) {
          toast({
            title: 'Success',
            description: `Successfully deleted billing period "${periodName}".`,
          })
          setIsOpen(false)
        } else {
          toast({
            title: 'Cannot Delete Period',
            description: res.error || 'Failed to delete billing period.',
            variant: 'destructive',
          })
        }
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <>
      <Button 
        type="button"
        variant="ghost" 
        size="sm" 
        className="size-9 p-0 hover:bg-status-overdue-bg hover:text-status-overdue text-muted-foreground transition-colors"
        onClick={() => setIsOpen(true)}
        title="Delete period"
        aria-label="Delete period"
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Billing Period</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the billing period <strong className="text-slate-900 dark:text-white">"{periodName}"</strong>? 
              This action cannot be undone. 
              <br /><br />
              <span className="text-xs font-semibold text-rose-600">Note:</span> You can only delete billing periods that have no associated invoices or water bills.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete} 
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
