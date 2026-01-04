import { generateObject } from 'ai';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { db, transactions } from '@/lib/db';
import { getCategoryId } from '@/lib/services';

import type { TransactionInput } from '@/lib/services/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let rawTransactions: TransactionInput[] = [];

  try {
    // MOCK: Get the user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    const body = await req.json();
    rawTransactions = body.transactions || [];

    // Minimized payload for the LLM
    const minimized = rawTransactions.map((t: TransactionInput) => ({ id: t.id, desc: t.description }));
    const validCategories = DEFAULT_CATEGORIES.map(c => c.name).join(', ');

    const { object } = await generateObject({
      model: 'openai/gpt-4o-mini',
      schema: z.object({
        categorizations: z.array(
          z.object({
            id: z.string(),
            category: z.string(),
            confidence: z.number()
          })
        )
      }),
      prompt: `
CONTEXT: You are an intelligent financial transaction classifier. Your job is to categorize raw bank transaction descriptions into standardized categories.

LOGIC:
1. Analyze the transaction description for keywords (e.g., merchant names, types of service).
2. Match the description to the MOST appropriate category from the list of ALLOWED CATEGORIES.
3. If the description is vague ("Venmo", "Check"), ambiguous, or contains no useful information, use "Uncategorized".
4. Assign a confidence score (0.00 to 1.00) based on how certain you are of the match.
   - 1.00: Exact match (e.g., "Netflix" -> "Entertainment")
   - 0.80: Strong likelihood
   - 0.50: Guess based on partial keywords
   - 0.00: No clue (use "Uncategorized")

ALLOWED CATEGORIES:
${validCategories}

EXAMPLES:
- Input: "NFLX" -> { "category": "Entertainment", "confidence": 0.95 }
- Input: "Safeway #2312" -> { "category": "Groceries", "confidence": 0.98 }
- Input: "Check 101" -> { "category": "Uncategorized", "confidence": 0.0 }
- Input: "In-N-Out Burger" -> { "category": "Food & Drink", "confidence": 1.0 }

RESTRICTIONS:
- Return ONLY the JSON object with the "categorizations" array.
- Do NOT output markdown or explanation text.
- Use ONLY the categories listed above.

INPUT TRANSACTIONS:
${JSON.stringify(minimized)}`
    });

    // DB UPDATE LOOP
    // Update the rows in Neon with the new AI results
    const updates = object.categorizations.map(async (cat: { id: string; category: string; confidence: number }) => {
      const catId = await getCategoryId(cat.category);

      await db
        .update(transactions)
        .set({
          categoryId: catId,
          categoryStatus: 'completed',
          categorySource: 'ai',
          categoryConfidence: cat.confidence.toString(),
          updatedAt: new Date()
        })
        .where(and(eq(transactions.id, cat.id), eq(transactions.userId, user.id)));
    });

    await Promise.all(updates);

    return NextResponse.json({ categorizations: object.categorizations });
  } catch (error) {
    console.error('AI Processing Error:', error);
    // FALLBACK: If AI crashes, return everything as Uncategorized so the UI doesn't break
    const fallback = rawTransactions.map((t: TransactionInput) => ({
      id: t.id,
      category: 'Uncategorized',
      confidence: 0
    }));
    return NextResponse.json({ categorizations: fallback });
  }
}
