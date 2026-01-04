import fs from 'fs';
import path from 'path';

// =============================================================================
// CONFIG
// =============================================================================

// Target constraints
const TARGET_MIN_ROWS = 10001;
const TARGET_MAX_ROWS = 10999;
const YEARS_MIN = 3;
const YEARS_MAX = 5;

const OUTPUT_DIR = path.join(process.cwd(), 'csv');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUTPUT_FILE = path.join(OUTPUT_DIR, `transactions_${timestamp}.csv`);

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
  // INCOME (Stable - Increased to match high transaction volume)
  {
    category: 'Salary',
    merchants: ['PAYROLL DEPOSIT', 'DIRECT DEPOSIT - EMPLOYER', 'ACH PAYROLL'],
    minAmount: 4200,
    maxAmount: 4500, // ~104k-110k/year (take home)
    frequency: 'fixed',
    fixedDay: 15,
    isIncome: true,
    volatility: 'low'
  },
  {
    category: 'Salary',
    merchants: ['PAYROLL DEPOSIT', 'DIRECT DEPOSIT - EMPLOYER', 'ACH PAYROLL'],
    minAmount: 4200,
    maxAmount: 4500,
    frequency: 'fixed',
    fixedDay: 1,
    isIncome: true,
    volatility: 'low'
  },

  // HOUSING (Stable)
  {
    category: 'Rent/Mortgage',
    merchants: ['SUMMIT VILLAGE APT', 'RENT PAYMENT', 'AVALON APARTMENTS'],
    minAmount: 2400,
    maxAmount: 2400,
    frequency: 'fixed',
    fixedDay: 1,
    volatility: 'low'
  },

  // UTILITIES (Semi-stable)
  {
    category: 'Utilities',
    merchants: ['SDG&E UTILITIES', 'PG&E ELECTRIC', 'WATER DISTRICT', 'COMCAST INTERNET', 'VERIZON WIRELESS'],
    minAmount: 40,
    maxAmount: 180,
    frequency: 'monthly_random',
    volatility: 'low'
  },

  // GROCERIES (Lower amounts, higher frequency)
  {
    category: 'Groceries',
    merchants: [
      'COSTCO WHOLESALE',
      'TRADER JOES',
      'WALMART SUPERCENTER',
      'SAFEWAY',
      'WHOLE FOODS MKT',
      'SPROUTS FARMERS MKT',
      'LOCAL MARKET'
    ],
    minAmount: 15,
    maxAmount: 120, // Smaller trips
    frequency: 'biased',
    weekendBias: 0.8,
    volatility: 'medium'
  },

  // GAS (Regular)
  {
    category: 'Gas',
    merchants: ['SHELL OIL', 'CHEVRON', 'ARCO AMPM', 'EXXON MOBIL', '76 STATION'],
    minAmount: 35,
    maxAmount: 75,
    frequency: 'biased',
    weekendBias: 0.4,
    volatility: 'low'
  },

  // DINING (High Volatility, Lower Avg)
  {
    category: 'Dining',
    merchants: [
      'CHIPOTLE',
      'PANERA BREAD',
      'MCDONALDS',
      'IN-N-OUT BURGER',
      'TACO BELL',
      'SUBWAY',
      'LOCAL BISTRO',
      'SUSHI HOUSE',
      'PIZZA PORT',
      'UBER EATS',
      'DOORDASH'
    ],
    minAmount: 8,
    maxAmount: 45, // Mostly cheap eats
    frequency: 'random',
    baseDailyChance: 0.5,
    volatility: 'high'
  },

  // COFFEE (Habitual)
  {
    category: 'Coffee',
    merchants: ['STARBUCKS', 'PEETS COFFEE', 'DUNKIN', 'LOCAL COFFEE SHOP', 'PHILZ COFFEE'],
    minAmount: 4,
    maxAmount: 12,
    frequency: 'random',
    baseDailyChance: 0.8,
    volatility: 'medium'
  },

  // SUBSCRIPTIONS (Fixed but multiple)
  {
    category: 'Subscriptions',
    merchants: [
      'NETFLIX.COM',
      'SPOTIFY USA',
      'AMAZON PRIME',
      'HULU',
      'DISNEY PLUS',
      'NYT SUBSCRIPTION',
      'APPLE ICLOUD',
      'GOOGLE STORAGE'
    ],
    minAmount: 5,
    maxAmount: 20,
    frequency: 'monthly_random',
    volatility: 'low'
  },

  // SHOPPING (Extreme Volatility, Lower Avg)
  {
    category: 'Shopping',
    merchants: ['AMAZON.COM', 'TARGET', 'BEST BUY', 'WALMART.COM', 'EBAY', 'UNIQLO', 'GAP', 'CVS', 'DOLLAR STORE'],
    minAmount: 10,
    maxAmount: 85, // Lower cap for frequent shopping
    frequency: 'random',
    baseDailyChance: 0.2,
    volatility: 'extreme'
  },

  // TRANSPORTATION
  {
    category: 'Transportation',
    merchants: ['UBER', 'LYFT', 'PARKING METER', 'BART TICKET', 'CLIPPER CARD', 'FASTTRAK', 'LIME SCOOTER'],
    minAmount: 3,
    maxAmount: 35,
    frequency: 'random',
    baseDailyChance: 0.15,
    volatility: 'medium'
  },

  // ENTERTAINMENT
  {
    category: 'Entertainment',
    merchants: [
      'AMC THEATRES',
      'STEAM GAMES',
      'PLAYSTATION NETWORK',
      'TICKETMASTER',
      'DAVE AND BUSTERS',
      'SPOTIFY',
      'KINDLE EBOOK'
    ],
    minAmount: 5,
    maxAmount: 60,
    frequency: 'random',
    baseDailyChance: 0.1,
    volatility: 'high'
  },

  // HEALTHCARE
  {
    category: 'Healthcare',
    merchants: ['CVS PHARMACY', 'WALGREENS', 'RITE AID', 'COPAY'],
    minAmount: 10,
    maxAmount: 50,
    frequency: 'random',
    baseDailyChance: 0.05,
    volatility: 'low'
  },

  // FITNESS
  {
    category: 'Fitness',
    merchants: ['PLANET FITNESS', 'EQUINOX', '24 HOUR FITNESS', 'YOGA STUDIO'],
    minAmount: 30,
    maxAmount: 100,
    frequency: 'fixed',
    fixedDay: 1,
    volatility: 'low'
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
  const years = rand(YEARS_MIN, YEARS_MAX); // e.g. 4.2 years
  const daysTotal = Math.floor(years * 365);

  const start = new Date(today);
  start.setDate(today.getDate() - daysTotal);

  // 2. Determine Target Count
  // We want between 10k and 11k transactions total.
  // We need to calculate a multiplier for our probabilities to hit this density.
  const targetCount = Math.floor(rand(TARGET_MIN_ROWS, TARGET_MAX_ROWS));

  console.log(`Config: Generating ~${targetCount} transactions over ${daysTotal} days (${years.toFixed(2)} years)`);

  // Calculate Base Rate needed
  // Estimate fixed transactions first to subtract them
  // Approx fixed per month: 2 (salary) + 1 (rent) + 1 (fitness) + ~3 (utilities) + ~3 (subs) = ~10
  const monthsTotal = daysTotal / 30;
  const estimatedFixed = monthsTotal * 10;
  const neededVariable = targetCount - estimatedFixed;
  const neededPerDay = neededVariable / daysTotal;

  // Sum of base probabilities in our config
  // Groceries (~0.2), Gas (~0.15), Dining (0.4), Coffee (0.7), Shopping (0.2), Trans (0.15), Ent (0.1), Health (0.05)
  // Total base sum ~= 1.95
  const baseProbSum = 1.95;

  // This multiplier adjusts our base chances to match the required density
  const globalFrequencyMultiplier = neededPerDay / baseProbSum;

  console.log(
    `Frequency Multiplier: ${globalFrequencyMultiplier.toFixed(2)} (Need ~${neededPerDay.toFixed(2)} variable tx/day)`
  );

  const current = new Date(start);

  while (current <= today) {
    const dayOfMonth = current.getDate();
    const month = current.getMonth(); // 0-11
    const isWknd = isWeekend(current);

    // 3. Monthly "Vibe" / Seasonality
    // 1.0 is normal.
    // December (11) is high spending.
    // Random "spree" months.
    let monthlySpendingFactor = 1.0;

    // Seasonal
    if (month === 11) monthlySpendingFactor = 1.5; // December holiday spend
    if (month === 6 || month === 7) monthlySpendingFactor = 1.2; // Summer

    // Random fluctuation per month (simulates life events)
    // We hash the YYYY-MM to keep it consistent for the whole month
    const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
    // Simple hash for pseudo-random consistency per month
    let hash = 0;
    for (let i = 0; i < monthKey.length; i++) hash = (hash << 5) - hash + monthKey.charCodeAt(i);
    const randomMonthFactor = (Math.abs(hash) % 100) / 100; // 0.0 to 1.0

    // 20% chance of a "High Spend" month (travel, emergency, hobby)
    if (randomMonthFactor > 0.8) {
      monthlySpendingFactor *= 1.4;
    } else if (randomMonthFactor < 0.1) {
      // 10% chance of "Frugal" month
      monthlySpendingFactor *= 0.7;
    }

    for (const cluster of CLUSTERS) {
      let shouldGenerate = false;
      // Adjust probability based on volatility and monthly factor
      let currentFactor = 1.0;

      if (!cluster.isIncome && cluster.category !== 'Rent/Mortgage') {
        if (cluster.volatility === 'extreme')
          currentFactor = monthlySpendingFactor * monthlySpendingFactor; // Amplify
        else if (cluster.volatility === 'high') currentFactor = monthlySpendingFactor;
        else if (cluster.volatility === 'medium') currentFactor = (monthlySpendingFactor + 1) / 2; // Dampen
        // low volatility ignores monthly factor mostly
      }

      switch (cluster.frequency) {
        case 'fixed':
          shouldGenerate = cluster.fixedDay === dayOfMonth;
          break;

        case 'monthly_random':
          // Rough approximation: if we want avg 2 per month, chance is 2/30
          // We'll use a 10% chance per day but cap it?
          // Simpler: just use random chance but calibrated to ~2-3 times a month
          shouldGenerate = Math.random() < 0.1 * currentFactor;
          break;

        case 'biased':
          const bias = cluster.weekendBias || 0.5;
          const biasChance = isWknd ? bias : (1 - bias) * 0.4; // Normalize slightly
          // Scale by global multiplier to hit total row count
          shouldGenerate = Math.random() < biasChance * globalFrequencyMultiplier * currentFactor;
          break;

        case 'random':
          const base = cluster.baseDailyChance || 0.1;
          shouldGenerate = Math.random() < base * globalFrequencyMultiplier * currentFactor;
          break;
      }

      if (shouldGenerate) {
        // Amount variation
        let amount = rand(cluster.minAmount, cluster.maxAmount);

        // "Go crazy" on amounts too for volatile categories
        if (cluster.volatility === 'extreme' || cluster.volatility === 'high') {
          if (Math.random() > 0.95) {
            amount *= rand(1.5, 3.0); // Occasional splurge
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

  // Truncate or Pad to strictly meet 10,000 - 11,000 requirement if we missed slightly
  // (Though logic above should be close)
  if (transactions.length > TARGET_MAX_ROWS) {
    console.log(`Trimming ${transactions.length - TARGET_MAX_ROWS} rows to match limit.`);
    // Remove random variable transactions, keep fixed ones?
    // Simpler: just slice the end or beginning.
    // Ideally we remove from the middle to keep date range, but slicing end is safer for date consistency.
    // Actually, let's just random remove non-income/rent items to preserve structural integrity.
    let attempts = 0;
    while (transactions.length > TARGET_MAX_ROWS && attempts < 5000) {
      const idx = Math.floor(Math.random() * transactions.length);
      const t = transactions[idx];
      // Try not to delete Salary or Rent
      if (!t.description.includes('PAYROLL') && !t.description.includes('RENT')) {
        transactions.splice(idx, 1);
      }
      attempts++;
    }
  }

  if (transactions.length < TARGET_MIN_ROWS) {
    console.log(`Padding ${TARGET_MIN_ROWS - transactions.length} rows to match limit.`);
    // Add extra "Coffee" or "Dining" scattered randomly
    while (transactions.length < TARGET_MIN_ROWS) {
      const randomTime = start.getTime() + Math.random() * (today.getTime() - start.getTime());
      const d = new Date(randomTime);
      transactions.push({
        date: formatDate(d),
        description: pick(['STARBUCKS', 'MCDONALDS', '7-ELEVEN', 'AMAZON.COM']),
        amount: -rand(5, 25)
      });
    }
    // Re-sort
    transactions.sort((a, b) => a.date.localeCompare(b.date));
  }

  return transactions;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('Generating realistic transaction CSV...\n');

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
  console.log(`  Income:   $${income.toFixed(2)}`);
  console.log(`  Expenses: $${expenses.toFixed(2)}`);
  console.log(`  Net:      $${(income - expenses).toFixed(2)}`);
}

main();
