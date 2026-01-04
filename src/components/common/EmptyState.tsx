import { FileText } from 'lucide-react';
import Link from 'next/link';

import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

export function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-4" />

        <h3 className="text-lg font-semibold">No Transactions Found</h3>

        <p className="text-muted-foreground mb-6 max-w-sm">
          We need some transaction data to generate personalized financial insights for you.
        </p>

        <Button asChild>
          <Link href="/upload">Upload Transactions</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
