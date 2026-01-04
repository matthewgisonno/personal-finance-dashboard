import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db, transactions, accounts } from '@/lib/db';
import { getCategoryId, attemptLocalCategorization } from '@/lib/services';

import type { TransactionInput } from '@/lib/services/types';

export async function POST(req: NextRequest) {
  try {
    const { transactions: rawTx, accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // MOCK: Get the first user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found for mock' }, { status: 400 });
    }

    let totalAmount = 0;

    // Prepare data for DB
    const preparedData = await Promise.all(
      rawTx.map(async (tx: TransactionInput) => {
        const localMatch = attemptLocalCategorization(tx.description);

        // Default to Uncategorized, never null
        let categoryId = await getCategoryId('Uncategorized');
        let status = 'pending';
        let method = 'pending';
        let confidence = 0;
        let categoryName = null;

        if (localMatch) {
          categoryId = await getCategoryId(localMatch.category);
          status = 'completed';
          method = 'local';
          confidence = 1.0;
          categoryName = localMatch.category;
        }

        totalAmount += tx.amount;

        return {
          insert: {
            // ID: Let Postgres generate the UUID
            date: new Date(tx.date),
            description: tx.description,
            amount: tx.amount.toString(),
            userId: user.id,
            accountId: accountId || null,
            categoryId,
            categoryStatus: status,
            categorySource: method,
            categoryConfidence: confidence.toString()
          },
          categoryName
        };
      })
    );

    const toInsert = preparedData.map(p => p.insert);

    // Batch Insert into Neon
    const inserted = await db.insert(transactions).values(toInsert).returning();

    // Merge category names back into the response so UI updates immediately
    const dataWithCategory = inserted.map((row, i) => ({
      ...row,
      category: preparedData[i].categoryName
    }));

    // Update Account Balance
    if (accountId) {
      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} + ${totalAmount.toFixed(2)}`
        })
        .where(eq(accounts.id, accountId));
    }

    return NextResponse.json({ data: dataWithCategory });
  } catch (error) {
    console.error('DB Error:', error);
    return NextResponse.json({ error: 'Failed to ingest' }, { status: 500 });
  }
}
