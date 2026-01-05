import { generateObject } from 'ai';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { db, transactions } from '@/lib/db';
import { type CategorizeAiInput, categorizeAiSchema } from '@/lib/schemas';
import { getCategoryId } from '@/lib/services';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let rawTransactions: CategorizeAiInput['transactions'] = [];

  try {
    // MOCK: Get the user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = categorizeAiSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: z.treeifyError(parseResult.error) },
        { status: 400 }
      );
    }

    rawTransactions = parseResult.data.transactions;

    // Minimized payload for the LLM
    // We send the index as the ID to save tokens and prevent the LLM from hallucinating/mangling UUIDs
    // O(n)
    const minimized = rawTransactions.map((t, idx) => ({
      i: idx.toString(),
      d: t.description
    }));
    // (O(c)) where c = number of categories
    const validCategories = DEFAULT_CATEGORIES.map(c => c.name).join(', ');

    const { object } = await generateObject({
      model: 'openai/gpt-4o-mini',
      schema: z.object({
        categorizations: z.array(
          z.object({
            i: z.string().describe('The transaction id (index) from the input'),
            t: z.string().describe('The category name'),
            n: z.number().describe('Confidence score (0-1)')
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
- Input: { "i": "0", "d": "NFLX" } -> { "i": "0", "t": "Entertainment", "n": 0.95 }
- Input: { "i": "1", "d": "Safeway #2312" } -> { "i": "1", "t": "Groceries", "n": 0.98 }
- Input: { "i": "2", "d": "Check 101" } -> { "i": "2", "t": "Uncategorized", "n": 0.0 }
- Input: { "i": "3", "d": "In-N-Out Burger" } -> { "i": "3", "t": "Food & Drink", "n": 1.0 }

RESTRICTIONS:
- Return ONLY the JSON object with the "categorizations" array.
- Do NOT output markdown or explanation text.
- Use ONLY the categories listed above.
- You MUST pass back the exact "i" (id) from the input for each transaction.

INPUT TRANSACTIONS:
${JSON.stringify(minimized)}`
    });

    // DB UPDATE LOOP
    // Update the rows in Neon with the new AI results
    // O(n) DB calls
    const updates = object.categorizations.map(async (cat: { i: string; t: string; n: number }) => {
      const index = parseInt(cat.i);
      const originalTransaction = rawTransactions[index];

      // Guard against bad indices or hallucinations
      if (!originalTransaction) {
        return;
      }

      const catId = await getCategoryId(cat.t);

      await db
        .update(transactions)
        .set({
          categoryId: catId,
          categoryStatus: 'completed',
          categorySource: 'ai',
          categoryConfidence: cat.n.toString(),
          updatedAt: new Date()
        })
        .where(and(eq(transactions.id, originalTransaction.id), eq(transactions.userId, user.id)));
    });

    await Promise.all(updates);

    // Remap back to UUIDs for the client
    // O(n)
    const responseCategorizations = object.categorizations
      .map((cat: { i: string; t: string; n: number }) => {
        const index = parseInt(cat.i);
        const original = rawTransactions[index];
        if (!original) return null;
        return {
          ...cat,
          i: original.id
        };
      })
      .filter(Boolean);

    return NextResponse.json({ categorizations: responseCategorizations });
  } catch (error) {
    console.error('AI Processing Error:', error);
    // FALLBACK: If AI crashes, return everything as Uncategorized so the UI doesn't break
    // O(n)
    const fallback = rawTransactions.map(t => ({
      i: t.id,
      t: 'Uncategorized',
      n: 0
    }));
    return NextResponse.json({ categorizations: fallback });
  }
}
