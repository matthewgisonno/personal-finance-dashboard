import { subYears } from 'date-fns';
import { PieChart } from 'lucide-react';

import { EmptyState } from '@/components/common';
import { Header, PageContainer } from '@/components/layout';
import {
  ExpensesByCategoryChart,
  FilteredReportsEmptyState,
  MonthlyExpensesChart,
  ReportFilters
} from '@/components/reports';
import {
  getExpenseCategoryData,
  getAccounts,
  getMonthlyExpenseData,
  getCategories,
  CategoryType,
  hasTransactions,
  getMostRecentTransactionDate
} from '@/lib/actions';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReportsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;

  const account = typeof searchParams.account === 'string' ? searchParams.account : undefined;
  const from = typeof searchParams.from === 'string' ? searchParams.from : undefined;
  const to = typeof searchParams.to === 'string' ? searchParams.to : undefined;

  let endDate = to ? new Date(to) : undefined;
  if (!endDate) {
    const latestDate = await getMostRecentTransactionDate();
    endDate = latestDate ?? new Date();
  }
  const startDate = from ? new Date(from) : subYears(endDate, 1);

  const [hasAnyTransactions, expenseData, accounts, monthlyData, categories] = await Promise.all([
    hasTransactions(),
    getExpenseCategoryData({ account, startDate, endDate }),
    getAccounts(),
    getMonthlyExpenseData({ account, startDate, endDate }),
    getCategories(CategoryType.Expense)
  ]);

  const hasFilteredData = expenseData.length > 0 || monthlyData.length > 0;

  return (
    <>
      <Header title="Reports" icon={<PieChart className="h-6 w-6" />} description="View your financial reports" />

      <PageContainer>
        {!hasAnyTransactions ? (
          <EmptyState />
        ) : (
          <>
            <ReportFilters
              key={`${account ?? 'all'}|${from ?? ''}|${to ?? ''}`}
              accounts={accounts}
              defaultDateRange={{ from: startDate, to: endDate }}
            />

            {!hasFilteredData && <FilteredReportsEmptyState />}

            {expenseData.length > 0 && (
              <ExpensesByCategoryChart data={expenseData} dateRange={{ from: startDate, to: endDate }} />
            )}

            {monthlyData.length > 0 && (
              <MonthlyExpensesChart
                data={monthlyData}
                categories={categories}
                dateRange={{ from: startDate, to: endDate }}
              />
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}
