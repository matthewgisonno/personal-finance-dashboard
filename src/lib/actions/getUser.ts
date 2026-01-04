'use server';

import { db } from '@/lib/db';

export async function getUser() {
  const user = await db.query.users.findFirst();
  return user || null;
}
