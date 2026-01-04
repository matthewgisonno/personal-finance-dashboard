import { TransactionDisplay } from '@/components/transactions';
import { getCategories, getAccounts, getTransactions, CategoryType } from '@/lib/actions';

export async function TransactionListWrapper() {
  const [data, categories, accounts] = await Promise.all([
    getTransactions(),
    getCategories(CategoryType.All),
    getAccounts()
  ]);

  return <TransactionDisplay inputData={data} categories={categories} accounts={accounts} />;
}
