// FAST PATH: simple keyword matching rules (case-insensitive)
const LOCAL_RULES: Record<string, string> = {
  // Food & Drink
  starbucks: 'Food & Drink',
  mcdonalds: 'Food & Drink',
  'in-n-out': 'Food & Drink',
  chipotle: 'Food & Drink',

  // Groceries
  safeway: 'Groceries',
  costco: 'Groceries',

  // Transportation
  uber: 'Transportation',
  shell: 'Transportation',
  chevron: 'Transportation',

  // Shopping
  target: 'Shopping',
  amazon: 'Shopping',

  // Utilities
  pge: 'Utilities',

  // Rent
  rent: 'Rent',

  // Health & Wellness
  kaiser: 'Health & Wellness',
  cvs: 'Health & Wellness',

  // Entertainment
  netflix: 'Entertainment',
  spotify: 'Entertainment',

  // Income
  payroll: 'Income'
};

export function attemptLocalCategorization(description: string) {
  const normalized = description.toLowerCase();
  for (const [key, category] of Object.entries(LOCAL_RULES)) {
    if (normalized.includes(key)) {
      return { category, confidence: 1.0 };
    }
  }
  return null;
}
