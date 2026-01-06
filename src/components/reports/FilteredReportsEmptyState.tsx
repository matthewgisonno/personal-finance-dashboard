'use client';

import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export function FilteredReportsEmptyState() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <h3 className="text-lg font-semibold">No Matching Transactions</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          No transactions match your current filters. Try adjusting them or clear all filters to see everything.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            router.push(pathname);
          }}
          className="cursor-pointer"
        >
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );
}
