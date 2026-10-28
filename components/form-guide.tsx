'use client'

import { Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface FormGuideProps {
  title?: string
  notes: string[]
  className?: string
}

export function FormGuide({
  title = "Notes",
  notes,
  className
}: FormGuideProps) {
  return (
    <Alert className={cn("bg-muted/50 border-muted-foreground/20", className)}>
      <Info className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4 space-y-1 mt-2">
          {notes.map((note, index) => (
            <li key={index} className="text-xs">{note}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
