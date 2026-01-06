import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db, transactions, accounts } from '@/lib/db';
import { ingestSchema } from '@/lib/schemas';
import { getCategoryMap, attemptLocalCategorization } from '@/lib/services';

import type { IngestInputType } from '@/lib/schemas/types';

export async function POST(req: NextRequest) {
  try {
    // Parse + validate request body
    // Typically O(n) w.r.t. number of transactions due to schema validation over the list
    const body = await req.json();
    const parseResult = ingestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: z.treeifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const { transactions: rawTx, accountId } = parseResult.data as IngestInputType;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // MOCK: Get the user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found for mock' }, { status: 400 });
    }

    // Pre-fetch category map to avoid N+1 DB calls
    // 1 DB call; work scales with categories returned (O(c))
    const categoryMap = await getCategoryMap();
    const uncategorizedId = categoryMap['uncategorized'];

    if (!uncategorizedId) {
      console.error("Critical: 'Uncategorized' category not found");
      // Fallback or error? For now error as it is critical
      return NextResponse.json(
        { error: 'System configuration error: Uncategorized category missing' },
        { status: 500 }
      );
    }

    let totalAmount = 0;

    // Prepare data for DB
    // O(n) where n = number of transactions
    // (Per-tx categorization work is mostly string matching in attemptLocalCategorization)
    const preparedData = rawTx.map(tx => {
      const localMatch = attemptLocalCategorization(tx.description);

      // Default to Uncategorized
      let categoryId = uncategorizedId;
      let status = 'pending';
      let method = 'pending';
      let confidence = 0;
      let categoryName = null;

      if (localMatch) {
        const matchedId = categoryMap[localMatch.category.toLowerCase()];
        if (matchedId) {
          categoryId = matchedId;
          status = 'completed';
          method = 'local';
          confidence = 1.0;
          categoryName = localMatch.category;
        }
      }

      totalAmount += tx.amount;

      return {
        insert: {
          // ID: Let Postgres generate the UUID
          date: new Date(tx.date),
          description: tx.description,
          amount: tx.amount.toString(),
          userId: user.id,
          accountId: accountId,
          categoryId,
          categoryStatus: status,
          categorySource: method,
          categoryConfidence: confidence.toString()
        },
        categoryName
      };
    });

    // O(n)
    const toInsert = preparedData.map(p => p.insert);

    // Batch Insert into Neon
    // 1 DB call inserting n rows (request/DB work scales with n)
    const inserted = await db.insert(transactions).values(toInsert).returning();

    // Merge category names back into the response so UI updates immediately
    // O(n)
    const dataWithCategory = inserted.map((row, i) => ({
      ...row,
      category: preparedData[i].categoryName
    }));

    // Update Account Balance
    if (accountId) {
      // 1 DB call
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
