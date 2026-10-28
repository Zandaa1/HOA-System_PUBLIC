'use client'

import { Button } from '@/components/ui/button'
import { CalendarPlus } from 'lucide-react'
import { generateYear } from '@/lib/actions/generate-billing-periods'
import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

export function GenerateYearButton() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const res = await generateYear()
        if (res.success) {
          toast({
            title: 'Success',
            description: res.count > 0 
              ? `Successfully generated ${res.count} billing period${res.count > 1 ? 's' : ''}.` 
              : 'All billing periods up to the end of the year already exist.',
          })
        }
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to generate billing periods.',
          variant: 'destructive',
        })
      } finally {
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline" 
        size="sm" 
        className="h-9 px-4"
      >
        <CalendarPlus className="mr-2 size-4" />
        Generate Periods
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Billing Periods</DialogTitle>
            <DialogDescription>
              This will automatically generate monthly billing periods starting from the next upcoming month until the end of the current year (December). 
              If the next month to generate is January, it will generate a full 12-month calendar year.
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
              onClick={handleGenerate} 
              disabled={isPending}
            >
              {isPending ? 'Generating...' : 'Confirm & Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
