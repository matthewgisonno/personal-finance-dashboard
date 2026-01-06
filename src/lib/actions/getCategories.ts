'use server';

import { asc, eq } from 'drizzle-orm';

import { db, categories } from '@/lib/db';

import type { CategoryOptionType } from './types';

export enum CategoryType {
  Expense = 'expense',
  Income = 'income',
  All = 'all'
}

export async function getCategories(type?: CategoryType): Promise<CategoryOptionType[]> {
  let query = db
    .select({
      id: categories.id,
      name: categories.name,
      color: categories.color,
      icon: categories.icon
    })
    .from(categories)
    .$dynamic();

  if (type === CategoryType.Expense) {
    query = query.where(eq(categories.type, CategoryType.Expense));
  } else if (type === CategoryType.Income) {
    query = query.where(eq(categories.type, CategoryType.Income));
  }

  // O(c) where c = number of categories (DB fetch + sort)
  const result = await query.orderBy(asc(categories.name));

  return result.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color || '#cccccc',
    icon: r.icon
  }));
}
