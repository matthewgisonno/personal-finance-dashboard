'use server';

import { asc, eq } from 'drizzle-orm';

import { db, accounts } from '@/lib/db';

import type { AccountOptionType } from './types';

export async function getAccounts(): Promise<AccountOptionType[]> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    return [];
  }

  const result = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type
    })
    .from(accounts)
    .where(eq(accounts.userId, user.id))
    .orderBy(asc(accounts.name));

  return result;
}
