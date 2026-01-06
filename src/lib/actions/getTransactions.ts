'use server';

import { desc, eq } from 'drizzle-orm';

import { db, transactions, categories, accounts } from '@/lib/db';

import type { CategorizedTransactionType } from '@/lib/services/types';

export async function getTransactions(): Promise<CategorizedTransactionType[]> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    throw new Error('No user found');
  }

  // O(n) where n = total transactions for user
  const data = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      categoryStatus: transactions.categoryStatus,
      categorySource: transactions.categorySource,
      categoryConfidence: transactions.categoryConfidence,
      category: categories.name,
      accountName: accounts.name,
      accountId: transactions.accountId
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.date));

  // Ensure strict type compatibility
  return data as unknown as CategorizedTransactionType[];
}
