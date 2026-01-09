'use server';

import { desc, eq } from 'drizzle-orm';

import { db, transactions } from '@/lib/db';

export async function getMostRecentTransactionDate(): Promise<Date | undefined> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    return undefined;
  }

  const result = await db
    .select({ date: transactions.date })
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.date))
    .limit(1);

  return result[0]?.date ? new Date(result[0].date) : undefined;
}
