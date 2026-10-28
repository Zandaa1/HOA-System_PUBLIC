'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, Search, Table2, Building2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: any
  createHref?: string
  createLabel?: string

  // Server-side pagination and search props
  serverPaged?: boolean
  pageCount?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  totalCount?: number
  initialSearch?: string
  onSearchChange?: (search: string) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  emptyTitle,
  emptyDescription,
  emptyIcon,
  createHref,
  createLabel,
  serverPaged = false,
  pageCount,
  currentPage = 0,
  onPageChange,
  totalCount,
  initialSearch = '',
  onSearchChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [searchValue, setSearchValue] = useState(initialSearch)

  // Sync searchValue with initialSearch when it changes externally
  useEffect(() => {
    setSearchValue(initialSearch)
  }, [initialSearch])

  // Detect mobile for default view
  useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setView('cards')
    }
  })

  const showEmptyState = (!data || data.length === 0) && (!serverPaged || !initialSearch)

  if (showEmptyState) {
    return (
      <EmptyState
        title={emptyTitle || 'No records found'}
        description={emptyDescription || "You don't have any items registered in this system yet."}
        icon={emptyIcon || Building2}
        actionLabel={createLabel}
        actionHref={createHref}
      />
    )
  }

  const paginationState = serverPaged
    ? { pageIndex: currentPage, pageSize: 15 }
    : undefined

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverPaged ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    manualPagination: serverPaged,
    pageCount: serverPaged ? pageCount : undefined,
    state: {
      sorting,
      columnFilters,
      ...(paginationState ? { pagination: paginationState } : {}),
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  })

  return (
    <div className="space-y-4" suppressHydrationWarning>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
        {searchKey && (
          <div className="relative w-full sm:flex-1 sm:max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={serverPaged ? searchValue : ((table.getColumn(searchKey)?.getFilterValue() as string) ?? '')}
              onChange={(event) => {
                if (serverPaged) {
                  setSearchValue(event.target.value)
                  if (onSearchChange) {
                    onSearchChange(event.target.value)
                  }
                } else {
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
              }}
              className="h-10 pl-9 rounded-md border border-muted/60 bg-muted/20 font-medium text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>
        )}
        <div className="flex bg-muted/40 rounded-lg p-1 border border-muted/60 shadow-sm shrink-0">
          <Button 
            variant={view === 'table' ? 'secondary' : 'ghost'} 
            size="icon-sm" 
            className="size-8 shrink-0 rounded-md"
            onClick={() => setView('table')}
            aria-label="Table view"
            title="Table view"
          >
            <Table2 className="size-4" />
          </Button>
          <Button 
            variant={view === 'cards' ? 'secondary' : 'ghost'} 
            size="icon-sm" 
            className="size-8 shrink-0 rounded-md"
            onClick={() => setView('cards')}
            aria-label="Cards view"
            title="Cards view"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="rounded-lg border border-muted/60 bg-card shadow-sm overflow-x-auto max-h-[70vh] overflow-y-auto">
          <div className="min-w-full inline-block align-middle">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-primary/5">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-primary/5 border-b border-muted/60 hover:bg-primary/5">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-12 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap bg-primary/5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/50 border-b border-muted transition-colors last:border-0 motion-safe:animate-fade-up fill-mode-both"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-6 py-4 text-sm align-middle whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-sm font-medium text-muted-foreground italic">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, index) => (
              <div
                key={row.id}
                className="rounded-xl border border-muted/60 bg-card p-6 space-y-6 shadow-sm hover:shadow-md transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 motion-safe:animate-fade-up fill-mode-both"
              >
                <div className="flex justify-between items-start border-b border-muted/40 pb-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold tracking-tight truncate">
                      {flexRender(row.getVisibleCells()[0].column.columnDef.cell, row.getVisibleCells()[0].getContext())}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {flexRender(row.getVisibleCells()[row.getVisibleCells().length - 1].column.columnDef.cell, row.getVisibleCells()[row.getVisibleCells().length - 1].getContext())}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-y-4">
                  {row.getVisibleCells().slice(1, -1).map((cell) => (
                    <div key={cell.id} className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : cell.column.id}
                      </p>
                      <div className="text-xs font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-muted/60 p-16 text-center bg-muted/10">
              <p className="text-sm font-medium text-muted-foreground italic">No records found.</p>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between pt-4 pb-2 px-6">
        <p className="text-xs font-medium text-muted-foreground">
          Showing <span className="text-foreground font-bold">{table.getRowModel().rows.length}</span> of <span className="text-foreground font-bold">{serverPaged && totalCount !== undefined ? totalCount : data.length}</span> results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="size-9 shadow-sm"
            onClick={() => {
              if (serverPaged && onPageChange) {
                onPageChange(currentPage - 1)
              } else {
                table.previousPage()
              }
            }}
            disabled={serverPaged ? currentPage === 0 : !table.getCanPreviousPage()}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center justify-center min-w-[3rem] h-9 rounded-md border bg-muted/30 px-2 text-xs font-bold tabular-nums">
            {serverPaged ? currentPage + 1 : table.getState().pagination.pageIndex + 1} / {serverPaged && pageCount !== undefined ? pageCount : table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            className="size-9 shadow-sm"
            onClick={() => {
              if (serverPaged && onPageChange) {
                onPageChange(currentPage + 1)
              } else {
                table.nextPage()
              }
            }}
            disabled={serverPaged ? (pageCount !== undefined ? currentPage >= pageCount - 1 : true) : !table.getCanNextPage()}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
