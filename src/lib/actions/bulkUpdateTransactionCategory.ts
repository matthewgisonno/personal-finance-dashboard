'use server';

import { eq, inArray, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db, transactions } from '@/lib/db';

export async function bulkUpdateTransactionCategory(transactionIds: string[], categoryId: string) {
  try {
    // MOCK: Get the user
    const user = await db.query.users.findFirst();
    if (!user) {
      throw new Error('User not found');
    }

    // Process in batches of 1000 to avoid query parameter limits
    const BATCH_SIZE = 1000;

    for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
      const batch = transactionIds.slice(i, i + BATCH_SIZE);

      await db
        .update(transactions)
        .set({
          categoryId: categoryId,
          categoryStatus: 'completed',
          categorySource: 'manual',
          updatedAt: new Date()
        })
        .where(and(inArray(transactions.id, batch), eq(transactions.userId, user.id)));
    }

    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    console.error('Failed to bulk update transaction categories:', error);
    return { success: false, error: 'Failed to update categories' };
  }
}
