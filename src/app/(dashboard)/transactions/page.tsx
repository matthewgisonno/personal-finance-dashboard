import { Receipt } from 'lucide-react';

import { Header } from '@/components/layout';
import { TransactionDisplay } from '@/components/transactions';
import { getCategories, getAccounts, CategoryType } from '@/lib/actions';

import type { CategorizedTransaction } from '@/lib/services/types';

export const dynamic = 'force-dynamic';

async function getTransactionsData(): Promise<CategorizedTransaction[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/transactions`);

  const { data } = await res.json();
  return data as CategorizedTransaction[];
}

export default async function TransactionsPage() {
  const data = await getTransactionsData();
  const categories = await getCategories(CategoryType.All);
  const accounts = await getAccounts();

  return (
    <>
      <Header
        title="Transactions"
        icon={<Receipt className="h-6 w-6" />}
        description="Manage your financial transactions"
      />

      <TransactionDisplay inputData={data} categories={categories} accounts={accounts} />
    </>
  );
}
