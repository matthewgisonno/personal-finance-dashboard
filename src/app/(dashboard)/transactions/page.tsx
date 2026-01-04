import { Receipt } from 'lucide-react';
import { Suspense } from 'react';

import { Header } from '@/components/layout';
import { TransactionListWrapper, TransactionTableSkeleton } from '@/components/transactions';

export const dynamic = 'force-dynamic';

export default function TransactionsPage() {
  return (
    <>
      <Header
        title="Transactions"
        icon={<Receipt className="h-6 w-6" />}
        description="Manage your financial transactions"
      />

      <Suspense fallback={<TransactionTableSkeleton />}>
        <TransactionListWrapper />
      </Suspense>
    </>
  );
}
