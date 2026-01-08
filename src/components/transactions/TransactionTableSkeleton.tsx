import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function TransactionTableSkeleton() {
  return (
    <>
      <Card className="gap-2 mb-4">
        <div className="flex items-center justify-between p-6">
          <CardHeader className="w-full p-0">
            <CardTitle className="w-full text-left">
              <Skeleton className="h-6 w-48" />
            </CardTitle>
          </CardHeader>
          <Skeleton className="h-4 w-4 mr-4" />
        </div>
      </Card>

      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="h-150 overflow-hidden relative rounded-md border border-border">
        <div className="grid w-full">
          <div className="flex w-full bg-card border-b border-border sticky top-0 z-10">
            <div className="flex px-2 py-2 font-semibold justify-start text-left" style={{ width: 150 }}>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex px-2 py-2 font-semibold justify-start text-left" style={{ width: 250 }}>
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex px-2 py-2 font-semibold justify-start text-left" style={{ width: 150 }}>
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex px-2 py-2 font-semibold justify-start text-left" style={{ width: 200 }}>
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex px-2 py-2 font-semibold justify-center text-center" style={{ width: 100 }}>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex px-2 py-2 font-semibold justify-center text-center" style={{ width: 100 }}>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex px-2 py-2 font-semibold justify-start text-left flex-1">
              <Skeleton className="h-4 w-8" />
            </div>
          </div>

          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="flex w-full border-b border-border items-center h-13.5 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="p-2" style={{ width: 150 }}>
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="p-2" style={{ width: 250 }}>
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="p-2" style={{ width: 150 }}>
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="p-2" style={{ width: 200 }}>
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="p-2 flex justify-center" style={{ width: 100 }}>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="p-2 flex justify-center" style={{ width: 100 }}>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="p-2 flex-1">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
