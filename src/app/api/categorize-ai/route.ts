import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { db, transactions } from '@/lib/db';
import { categorizeAiInputSchema, categorizeAiResponseSchema, type CategorizeAiInputType } from '@/lib/schemas';
import { getCategoryId } from '@/lib/services';

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  let rawTransactions: CategorizeAiInputType['transactions'] = [];

  try {
    // MOCK: Get the user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    // Validate request body
    // O(n) where n = number of transactions
    const body = await req.json();
    const parsedBody = categorizeAiInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.treeifyError(parsedBody.error)
        },
        { status: 400 }
      );
    }

    rawTransactions = parsedBody.data.transactions;

    // Prepare AI input
    // O(n) where n = number of transactions
    const minimized = rawTransactions.map((t, idx) => ({
      i: idx.toString(),
      d: t.description
    }));

    const validCategories = DEFAULT_CATEGORIES.map(c => c.name).join(', ');

    // OpenAI call
    // O(n) - Token count is linear to number of transactions
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent financial transaction classifier.'
        },
        {
          role: 'user',
          content: `
ALLOWED CATEGORIES:
${validCategories}

RULES:
- Use ONLY allowed categories
- Return ONLY valid JSON
- Confidence must be between 0 and 1

INPUT TRANSACTIONS:
${JSON.stringify(minimized)}

OUTPUT FORMAT:
{
  "categorizations": [
    { "i": "0", "t": "Groceries", "n": 0.95 }
  ]
}
          `
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty OpenAI response');
    }

    // O(n) - Parse response
    const aiResult = categorizeAiResponseSchema.parse(JSON.parse(content));

    // Build batched update rows
    const now = new Date();

    const updateRows: {
      id: string;
      userId: string;
      categoryId: string;
      confidence: number;
    }[] = [];

    // O(n) where n = number of categorizations
    for (const cat of aiResult.categorizations) {
      const index = Number(cat.i);
      const original = rawTransactions[index];
      if (!original) continue;

      // O(1) (cached)
      const categoryId = await getCategoryId(cat.t);

      updateRows.push({
        id: original.id,
        userId: user.id,
        categoryId,
        confidence: cat.n // already clamped
      });
    }

    // Batched update (single SQL statement)
    // O(n) - Single query construction
    if (updateRows.length > 0) {
      await db.execute(sql`
        UPDATE ${transactions} AS t
        SET
          category_id = v.category_id,
          category_status = 'completed',
          category_source = 'ai',
          category_confidence = v.confidence,
          updated_at = ${now}
        FROM (
          SELECT
            v.id::uuid              AS id,
            v.user_id::uuid         AS user_id,
            v.category_id::uuid     AS category_id,
            v.confidence::numeric   AS confidence
          FROM (
            VALUES
            ${sql.join(
              updateRows.map(r => sql`(${r.id}, ${r.userId}, ${r.categoryId}, ${r.confidence})`),
              sql`,`
            )}
          ) AS v(id, user_id, category_id, confidence)
        ) AS v
        WHERE
          t.id = v.id
          AND t.user_id = v.user_id
      `);
    }

    // Remap index IDs → UUIDs
    // O(n) where n = number of categorizations
    const responseCategorizations = aiResult.categorizations
      .map(cat => {
        const index = Number(cat.i);
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

    // Fallback
    // O(n) where n = number of transactions
    const fallback = rawTransactions.map(t => ({
      i: t.id,
      t: 'Uncategorized',
      n: 0
    }));

    return NextResponse.json({ categorizations: fallback });
  }
}
