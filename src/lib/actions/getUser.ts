'use server';

import { db } from '@/lib/db';

export async function getUser() {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  return user || null;
}
