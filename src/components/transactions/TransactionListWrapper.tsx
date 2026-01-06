import { TransactionDisplay } from '@/components/transactions';
import { getCategories, getAccounts, getTransactions, CategoryType } from '@/lib/actions';

export async function TransactionListWrapper() {
  // Parallel fetch: O(max(T_tx, T_cat, T_acc))
  // Effectively O(n) where n is transaction count (most likely the largest dataset)
  const [data, categories, accounts] = await Promise.all([
    getTransactions(),
    getCategories(CategoryType.All),
    getAccounts()
  ]);

  return <TransactionDisplay inputData={data} categories={categories} accounts={accounts} />;
}
