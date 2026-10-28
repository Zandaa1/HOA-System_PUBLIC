import { Card, CardContent, CardHeader } from './card'
import { Skeleton } from './skeleton'

export function SkeletonCard() {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-3 pt-5 px-6 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  )
}
