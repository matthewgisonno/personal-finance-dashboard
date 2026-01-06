'use server';

import { eq, sql } from 'drizzle-orm';

import { db, transactions } from '@/lib/db';

export async function hasTransactions(): Promise<boolean> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    return false;
  }

  const result = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(transactions)
    .where(eq(transactions.userId, user.id));

  return (result[0]?.count ?? 0) > 0;
}
