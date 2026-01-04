'use server';

import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db, transactions } from '@/lib/db';

export async function updateTransactionCategory(transactionId: string, categoryId: string) {
  try {
    // MOCK: Get the user
    const user = await db.query.users.findFirst();
    if (!user) {
      throw new Error('User not found');
    }

    await db
      .update(transactions)
      .set({
        categoryId: categoryId,
        categoryStatus: 'completed',
        categorySource: 'manual',
        updatedAt: new Date()
      })
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));

    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    console.error('Failed to update transaction category:', error);
    return { success: false, error: 'Failed to update category' };
  }
}
