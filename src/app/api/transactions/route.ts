import { and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db, transactions, categories, accounts } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // MOCK: Get the user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // pending | completed | null (all)
    const accountId = url.searchParams.get('accountId'); // optional uuid

    if (status && status !== 'pending' && status !== 'completed') {
      return NextResponse.json({ error: "Invalid 'status' query param" }, { status: 400 });
    }

    const conditions = [eq(transactions.userId, user.id)];
    if (status) conditions.push(eq(transactions.categoryStatus, status));
    if (accountId) conditions.push(eq(transactions.accountId, accountId));

    // 1 DB call to fetch n rows (work scales with n)
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
      .where(and(...conditions))
      .orderBy(desc(transactions.date));

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch due to error: ' + error }, { status: 500 });
  }
}
