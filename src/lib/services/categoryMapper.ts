import { db, categories } from '../db';

// Cache categories in memory to avoid 1000 DB calls per upload
let categoryCache: Record<string, string> | null = null;

export async function getCategoryMap() {
  if (categoryCache) return categoryCache;

  const allCats = await db.select().from(categories);

  categoryCache = allCats.reduce(
    (acc, cat) => {
      acc[cat.name.toLowerCase()] = cat.id;
      return acc;
    },
    {} as Record<string, string>
  );

  return categoryCache!;
}

export async function getCategoryId(name: string): Promise<string> {
  const map = await getCategoryMap();
  // Fallback to "Uncategorized" if AI invents a new category
  const id = map[name.toLowerCase()];
  if (id) return id;

  const fallback = map['uncategorized'];
  if (!fallback) {
    throw new Error("Critical: 'Uncategorized' category not found in database.");
  }
  return fallback;
}
