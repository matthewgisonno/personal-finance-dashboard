'use server';

import { subMonths, startOfMonth } from 'date-fns';
import { eq, sql, and, gte, ne, lte } from 'drizzle-orm';

import { db, transactions, categories, accounts } from '../db';

import type { ReportFilters } from './types';

export type MonthlyExpenseData = {
  month: string; // "YYYY-MM"
  category: string;
  amount: number;
};

export async function getMonthlyExpenseData(filters: ReportFilters = {}): Promise<MonthlyExpenseData[]> {
  const user = await db.query.users.findFirst();
  if (!user) return [];

  const endDate = filters.endDate || new Date();
  const startDate = filters.startDate || subMonths(startOfMonth(endDate), 11); // Last 12 months including current

  const conditions = [
    eq(categories.type, 'expense'),
    ne(categories.name, 'Transfer'), // Explicitly exclude Transfer
    eq(transactions.userId, user.id),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate)
  ];

  if (filters.account && filters.account !== 'all') {
    conditions.push(eq(accounts.name, filters.account));
  }

  const query = db
    .select({
      month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      category: categories.name,
      amount: sql<string>`sum(${transactions.amount})`
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id));

  if (filters.account && filters.account !== 'all') {
    query.innerJoin(accounts, eq(transactions.accountId, accounts.id));
  }

  const result = await query
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`, categories.name)
    .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

  return result.map(r => ({
    month: r.month,
    category: r.category || 'Uncategorized',
    amount: Math.abs(parseFloat(r.amount || '0'))
  }));
}
