import { subYears } from 'date-fns';
import { PieChart } from 'lucide-react';

import { EmptyState } from '@/components/common/EmptyState';
import { Header, PageContainer } from '@/components/layout';
import { ExpensesByCategoryChart, MonthlyExpensesChart, ReportFilters } from '@/components/reports';
import { getExpenseCategoryData, getAccounts, getMonthlyExpenseData, getCategories, CategoryType } from '@/lib/actions';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReportsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;

  const account = typeof searchParams.account === 'string' ? searchParams.account : undefined;
  const from = typeof searchParams.from === 'string' ? searchParams.from : undefined;
  const to = typeof searchParams.to === 'string' ? searchParams.to : undefined;

  const endDate = to ? new Date(to) : new Date();
  const startDate = from ? new Date(from) : subYears(endDate, 1);

  const [expenseData, accounts, monthlyData, categories] = await Promise.all([
    getExpenseCategoryData({ account, startDate, endDate }),
    getAccounts(),
    getMonthlyExpenseData({ account, startDate, endDate }),
    getCategories(CategoryType.Expense)
  ]);

  return (
    <>
      <Header title="Reports" icon={<PieChart className="h-6 w-6" />} description="View your financial reports" />

      <PageContainer>
        {expenseData.length === 0 && monthlyData.length === 0 && <EmptyState />}

        {expenseData.length > 0 && monthlyData.length > 0 && <ReportFilters accounts={accounts} />}

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
      </PageContainer>
    </>
  );
}
