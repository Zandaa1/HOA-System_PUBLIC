'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Eye, CreditCard, Search, X } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'

interface FeeType {
  id: string
  name: string
  description: string | null
  default_amount: number
  recurrence: 'monthly' | 'yearly' | 'one_time'
  is_active: boolean
}

interface FeeTypesGridProps {
  feeTypes: FeeType[]
}

export function FeeTypesGrid({ feeTypes }: FeeTypesGridProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return feeTypes
    const q = query.toLowerCase()
    return feeTypes.filter((f) =>
      f.name?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q)
    )
  }, [feeTypes, query])

  if (feeTypes.length === 0) {
    return (
      <EmptyState
        title="No Fee Types Yet"
        description="You don't have any fee types defined. Create a fee type (e.g., Monthly Dues, Amenity Usage, Sticker Fees) to start billing residents."
        icon={CreditCard}
        actionLabel="Add Fee Type"
        actionHref="/dashboard/billing/fee-types/new"
      />
    )
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fee types..."
            className="h-10 pl-9 pr-9"
            aria-label="Search fee types"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {query && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {feeTypes.length}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching fee types"
          description={`No fee types match "${query}". Try a different search term.`}
          icon={CreditCard}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((feeType) => (
            <Card key={feeType.id} className="shadow-sm border-muted/60 transition-all hover:shadow-md">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-lg font-bold text-primary">{feeType.name}</CardTitle>
                  <Badge variant="secondary" className={`text-[10px] font-bold border ${feeType.is_active ? 'bg-status-paid-bg text-status-paid border-status-paid-border' : 'bg-status-inactive-bg text-status-inactive border-status-inactive-border'}`}>
                    {feeType.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px]">
                  {feeType.description || 'No description provided'}
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <div className="flex items-center justify-between text-sm py-2 border-y border-muted/60">
                  <span className="text-muted-foreground font-medium">Default Amount</span>
                  <span className="font-bold text-primary">
                    ₱{Number(feeType.default_amount).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Frequency</span>
                  <Badge variant="outline" className="font-bold text-[10px] uppercase">
                    {feeType.recurrence === 'monthly' ? 'Monthly' : feeType.recurrence === 'yearly' ? 'Yearly' : 'One-time'}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild className="flex-1 h-9">
                    <Link href={`/dashboard/billing/fee-types/${feeType.id}`}>
                      <Eye className="mr-2 size-4" />
                      View
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="size-9 p-0 hover:bg-muted">
                    <Link href={`/dashboard/billing/fee-types/${feeType.id}/edit`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
