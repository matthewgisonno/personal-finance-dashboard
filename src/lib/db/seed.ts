import { DEFAULT_CATEGORIES } from '../constants';

import { categories, accounts, users, transactions, aiInsights } from './schema';

import { db } from './index';

const MOCK_USER = {
  email: 'Matthew_Gisonno@intuit.com',
  name: 'Matthew Gisonno',
  avatar: 'https://avatars.githubusercontent.com/u/85267156?v=4'
};

async function main() {
  console.log('🌱 Seeding database...');

  // 0. Clean up existing data
  await db.delete(transactions);
  await db.delete(aiInsights);
  await db.delete(accounts);
  await db.delete(users);
  // Keep categories as they are global/shared

  // 1. Create a mock user
  const [user] = await db.insert(users).values(MOCK_USER).returning();
  console.log('User created:', user.id);

  // 2. Create default accounts
  await db
    .insert(accounts)
    .values({
      userId: user.id,
      name: 'Main Checking',
      type: 'checking',
      balance: '0.00'
    })
    .onConflictDoNothing();

  await db
    .insert(accounts)
    .values({
      userId: user.id,
      name: 'Main Savings',
      type: 'savings',
      balance: '0.00'
    })
    .onConflictDoNothing();

  // 3. Upsert Categories
  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }

  console.log('✅ Seeding complete.');
}

main();
