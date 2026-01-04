'use server';

import { eq, sql, and, gte, lte } from 'drizzle-orm';

import { db, transactions, categories, accounts } from '../db';

import type { ReportFilters } from './types';
import type { ExpensesByCategoryChartData } from '@/components/reports/types';

export async function getExpenseCategoryData(filters: ReportFilters = {}): Promise<ExpensesByCategoryChartData[]> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    return [];
  }

  const conditions = [eq(categories.type, 'expense'), eq(transactions.userId, user.id)];

  if (filters.account && filters.account !== 'all') {
    conditions.push(eq(accounts.name, filters.account));
  }

  if (filters.startDate) {
    conditions.push(gte(transactions.date, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(transactions.date, filters.endDate));
  }

  const query = db
    .select({
      category: categories.name,
      amount: sql<string>`sum(${transactions.amount})`,
      color: categories.color,
      icon: categories.icon
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id));

  if (filters.account && filters.account !== 'all') {
    query.innerJoin(accounts, eq(transactions.accountId, accounts.id));
  }

  const result = await query.where(and(...conditions)).groupBy(categories.name, categories.color, categories.icon);

  return result
    .map(r => ({
      category: r.category || 'Uncategorized',
      amount: Math.abs(parseFloat(r.amount || '0')),
      fill: r.color || '#cccccc',
      icon: r.icon || null
    }))
    .filter(r => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
