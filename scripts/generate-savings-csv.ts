import fs from 'fs';
import path from 'path';

// =============================================================================
// CONFIG
// =============================================================================

// Target constraints for Savings Account (Lower volume than checking)
const TARGET_MIN_ROWS = 50;
const TARGET_MAX_ROWS = 150;
const YEARS_MIN = 1;
const YEARS_MAX = 1;

const OUTPUT_DIR = path.join(process.cwd(), 'csv');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUTPUT_FILE = path.join(OUTPUT_DIR, `savings_activity_${timestamp}.csv`);

// =============================================================================
// MERCHANT DATA
// =============================================================================

type MerchantCluster = {
  category: string;
  merchants: string[];
  minAmount: number;
  maxAmount: number;
  frequency: 'fixed' | 'biased' | 'random' | 'monthly_random';
  fixedDay?: number; // For fixed frequency
  weekendBias?: number; // For biased frequency (0-1)
  baseDailyChance?: number; // For random frequency (0-1) - adjusted dynamically
  isIncome?: boolean;
  volatility?: 'low' | 'medium' | 'high' | 'extreme'; // How much this category is affected by "crazy" months
};

const CLUSTERS: MerchantCluster[] = [
  // INTEREST (Income - Monthly)
  {
    category: 'Interest',
    merchants: ['INTEREST PAYMENT', 'MONTHLY INTEREST', 'BANK INTEREST'],
    minAmount: 15,
    maxAmount: 45, // Assuming a decent balance
    frequency: 'fixed',
    fixedDay: 28, // Usually end of month
    isIncome: true,
    volatility: 'low'
  },

  // REGULAR SAVINGS TRANSFERS (Income - Bi-weekly/Monthly)
  {
    category: 'Transfers',
    merchants: ['TRANSFER FROM CHK', 'ONLINE TRANSFER IN', 'AUTO SAVE TRANSFER'],
    minAmount: 800,
    maxAmount: 2000,
    frequency: 'fixed',
    fixedDay: 15, // Match typical payday
    isIncome: true,
    volatility: 'low'
  },
  {
    category: 'Transfers',
    merchants: ['TRANSFER FROM CHK', 'ONLINE TRANSFER IN', 'AUTO SAVE TRANSFER'],
    minAmount: 800,
    maxAmount: 2000,
    frequency: 'fixed',
    fixedDay: 1, // Match typical payday
    isIncome: true,
    volatility: 'low'
  },

  // WINDFALLS / IRREGULAR DEPOSITS (Income)
  {
    category: 'Deposit',
    merchants: ['TAX REFUND', 'BONUS DEPOSIT', 'GIFT DEPOSIT', 'MOBILE CHECK DEPOSIT'],
    minAmount: 200,
    maxAmount: 2000,
    frequency: 'random',
    baseDailyChance: 0.05, // Rare
    isIncome: true,
    volatility: 'high'
  },

  // WITHDRAWALS / TRANSFERS OUT (Expense)
  {
    category: 'Transfers',
    merchants: ['TRANSFER TO CHK', 'ONLINE TRANSFER OUT', 'OVERDRAFT PROTECTION'],
    minAmount: 100,
    maxAmount: 600,
    frequency: 'random',
    baseDailyChance: 0.03, // Occasional need
    volatility: 'medium'
  },

  // EMERGENCY / LARGE PURCHASES (Expense - Rare but large)
  {
    category: 'Expense',
    merchants: ['WIRE TRANSFER OUT', 'LARGE PURCHASE WITHDRAWAL', 'DOWN PAYMENT'],
    minAmount: 1000,
    maxAmount: 3000,
    frequency: 'random',
    baseDailyChance: 0.005, // Very rare
    volatility: 'extreme'
  }
];

// =============================================================================
// UTILITIES
// =============================================================================

function rand(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// =============================================================================
// GENERATOR
// =============================================================================

interface Transaction {
  date: string;
  description: string;
  amount: number;
}

function generateTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const today = new Date();

  // 1. Determine Timeframe
  const years = rand(YEARS_MIN, YEARS_MAX);
  const daysTotal = Math.floor(years * 365);

  const start = new Date(today);
  start.setDate(today.getDate() - daysTotal);

  // 2. Determine Target Count
  const targetCount = Math.floor(rand(TARGET_MIN_ROWS, TARGET_MAX_ROWS));

  console.log(`Config: Generating ~${targetCount} transactions over ${daysTotal} days (${years.toFixed(2)} years)`);

  // Calculate Base Rate needed
  // Estimate fixed transactions first to subtract them
  // Approx fixed per month: 1 (interest) + 2 (transfers) = 3
  const monthsTotal = daysTotal / 30;
  const estimatedFixed = monthsTotal * 3;

  // If we have more fixed transactions than target (unlikely with 50-150 range for 1 year), handle it.
  const neededVariable = Math.max(0, targetCount - estimatedFixed);
  const neededPerDay = neededVariable / daysTotal;

  // Sum of base probabilities in our config for variable/random clusters
  // Windfalls (0.05) + Transfers Out (0.08) + Emergency (0.01) = ~0.14
  const baseProbSum = 0.14;

  // This multiplier adjusts our base chances to match the required density
  const globalFrequencyMultiplier = baseProbSum > 0 ? neededPerDay / baseProbSum : 1;

  console.log(
    `Frequency Multiplier: ${globalFrequencyMultiplier.toFixed(2)} (Need ~${neededPerDay.toFixed(2)} variable tx/day)`
  );

  const current = new Date(start);

  while (current <= today) {
    const dayOfMonth = current.getDate();
    const month = current.getMonth(); // 0-11
    const isWknd = isWeekend(current);

    // 3. Monthly "Vibe" / Seasonality
    let monthlySpendingFactor = 1.0;

    // Seasonal (Saving more in winter/start of year, spending more in summer/holidays)
    if (month === 0) monthlySpendingFactor = 0.5; // Jan: Low spending/withdrawals (New Year Resolutions)
    if (month === 11) monthlySpendingFactor = 1.5; // Dec: High spending/withdrawals

    const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
    let hash = 0;
    for (let i = 0; i < monthKey.length; i++) hash = (hash << 5) - hash + monthKey.charCodeAt(i);
    const randomMonthFactor = (Math.abs(hash) % 100) / 100;

    // 20% chance of high activity month
    if (randomMonthFactor > 0.8) {
      monthlySpendingFactor *= 1.4;
    }

    for (const cluster of CLUSTERS) {
      let shouldGenerate = false;
      let currentFactor = 1.0;

      // Volatility mainly affects withdrawals/expenses in savings
      if (!cluster.isIncome) {
        if (cluster.volatility === 'extreme') currentFactor = monthlySpendingFactor * monthlySpendingFactor;
        else if (cluster.volatility === 'high') currentFactor = monthlySpendingFactor;
        else if (cluster.volatility === 'medium') currentFactor = (monthlySpendingFactor + 1) / 2;
      }

      switch (cluster.frequency) {
        case 'fixed':
          shouldGenerate = cluster.fixedDay === dayOfMonth;
          break;

        case 'monthly_random':
          shouldGenerate = Math.random() < 0.1 * currentFactor;
          break;

        case 'biased':
          const bias = cluster.weekendBias || 0.5;
          const biasChance = isWknd ? bias : (1 - bias) * 0.4;
          shouldGenerate = Math.random() < biasChance * globalFrequencyMultiplier * currentFactor;
          break;

        case 'random':
          const base = cluster.baseDailyChance || 0.1;
          shouldGenerate = Math.random() < base * globalFrequencyMultiplier * currentFactor;
          break;
      }

      if (shouldGenerate) {
        let amount = rand(cluster.minAmount, cluster.maxAmount);

        if (cluster.volatility === 'extreme' || cluster.volatility === 'high') {
          if (Math.random() > 0.95) {
            amount *= rand(1.5, 3.0);
          }
        }

        transactions.push({
          date: formatDate(current),
          description: pick(cluster.merchants),
          amount: cluster.isIncome ? amount : -amount
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  // Truncate or Pad
  if (transactions.length > TARGET_MAX_ROWS) {
    console.log(`Trimming ${transactions.length - TARGET_MAX_ROWS} rows to match limit.`);
    let attempts = 0;
    while (transactions.length > TARGET_MAX_ROWS && attempts < 5000) {
      const idx = Math.floor(Math.random() * transactions.length);
      const t = transactions[idx];
      // Try to keep Interest and Regular Transfers
      if (!t.description.includes('INTEREST') && !t.description.includes('TRANSFER FROM CHK')) {
        transactions.splice(idx, 1);
      }
      attempts++;
    }
  }

  if (transactions.length < TARGET_MIN_ROWS) {
    console.log(`Padding ${TARGET_MIN_ROWS - transactions.length} rows to match limit.`);
    // Add extra deposits or transfers
    while (transactions.length < TARGET_MIN_ROWS) {
      const randomTime = start.getTime() + Math.random() * (today.getTime() - start.getTime());
      const d = new Date(randomTime);
      transactions.push({
        date: formatDate(d),
        description: pick(['EXTRA TRANSFER FROM CHK', 'ATM DEPOSIT', 'CASH DEPOSIT']),
        amount: rand(50, 200)
      });
    }
    transactions.sort((a, b) => a.date.localeCompare(b.date));
  }

  return transactions;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('Generating realistic savings account CSV...\n');

  const transactions = generateTransactions();

  // Create CSV content
  const header = 'date,description,amount';
  const rows = transactions.map(t => `${t.date},"${t.description}",${t.amount.toFixed(2)}`);

  const csv = [header, ...rows].join('\n');

  fs.writeFileSync(OUTPUT_FILE, csv);

  console.log(`✓ Generated ${transactions.length} transactions`);
  console.log(`✓ Saved to: ${OUTPUT_FILE}`);

  // Summary
  const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  console.log(`\nSummary:`);
  console.log(`  Deposits/Interest: $${income.toFixed(2)}`);
  console.log(`  Withdrawals:       $${expenses.toFixed(2)}`);
  console.log(`  Net Change:        $${(income - expenses).toFixed(2)}`);
}

main();
