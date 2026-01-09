'use server';

import { subDays } from 'date-fns';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

import { getExpenseCategoryData } from '@/lib/actions/getExpenseCategoryData';
import { getMostRecentTransactionDate } from '@/lib/actions/getMostRecentTransactionDate';
import { db, aiInsights } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

import { aiInsightsSchema } from '../schemas';

import type { InsightDataType } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function getLatestInsight(): Promise<InsightDataType | null> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    return null;
  }

  const latestInsight = await db.query.aiInsights.findFirst({
    where: eq(aiInsights.userId, user.id),
    orderBy: [desc(aiInsights.generatedAt)]
  });

  if (!latestInsight) {
    return null;
  }

  return {
    ...latestInsight,
    recommendations: latestInsight.recommendations as InsightDataType['recommendations'],
    budgetAlerts: latestInsight.budgetAlerts as string[]
  };
}

export async function getInsightHistory(): Promise<InsightDataType[]> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    return [];
  }

  const history = await db.query.aiInsights.findMany({
    where: eq(aiInsights.userId, user.id),
    orderBy: [desc(aiInsights.generatedAt)],
    limit: 10
  });

  return history.map(item => ({
    ...item,
    recommendations: item.recommendations as InsightDataType['recommendations'],
    budgetAlerts: item.budgetAlerts as string[]
  }));
}

export async function generateInsightsAction(force: boolean = false): Promise<InsightDataType | null> {
  // MOCK: Get the user
  const user = await db.query.users.findFirst();
  if (!user) {
    throw new Error('No user found');
  }

  // 1. Check for existing fresh insights (< 1 week old)
  const latestInsight = await db.query.aiInsights.findFirst({
    where: eq(aiInsights.userId, user.id),
    orderBy: [desc(aiInsights.generatedAt)]
  });

  if (!force && latestInsight) {
    const generatedAt = new Date(latestInsight.generatedAt);
    const now = new Date();
    const msSinceGeneration = now.getTime() - generatedAt.getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    // If the insight is less than 7 days old, return it
    if (msSinceGeneration < sevenDaysInMs) {
      return {
        ...latestInsight,
        recommendations: latestInsight.recommendations as InsightDataType['recommendations'],
        budgetAlerts: latestInsight.budgetAlerts as string[]
      };
    }
  }

  // 2. Fetch Aggregated Data (Last 30 Days)
  // Get the latest transaction
  const latestTransactionDate = await getMostRecentTransactionDate();

  // If no transactions, return null
  if (!latestTransactionDate) {
    return null;
  }

  const endDate = new Date(latestTransactionDate);
  const startDate = subDays(endDate, 30);

  // O(n) (calls getExpenseCategoryData)
  const categoryData = await getExpenseCategoryData({
    startDate,
    endDate
  });

  if (!categoryData || categoryData.length === 0) {
    return null;
  }

  // 3. Anonymize the payload & Minify for token efficiency
  const contextPayload = categoryData.map(item => ({
    c: item.category,
    a: item.amount
  }));

  const totalMonthlySpending = contextPayload.reduce((a, b) => a + b.a, 0);

  // 4. Generate Insights
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an empathetic, practical financial advisor helping the user improve their financial health.
Return ONLY valid JSON matching this minified structure:
{
  "s": "string", // summary
  "r": [ // recommendations
    { "c": "string", "t": "string", "p": number } // category, tip, potentialSavings
  ],
  "b": ["string"] // budgetAlerts
}`
      },
      {
        role: 'user',
        content: `
        Analyze this monthly spending distribution:

        **Context**:
        - Total Spending (Last 30 Days): ${formatCurrency(totalMonthlySpending)}
        - Category Breakdown (c=category, a=amount): ${JSON.stringify(contextPayload)}

        **Limitations**:
        - Rely ONLY on the provided categories; do not hallucinate merchants or transaction details.
        - Ensure advice is realistic for the given spending levels.

        **Expectations**:
        - Identify the top 3 highest spending categories.
        - Provide specific, actionable tips to reduce spending in these areas.
        - Flag any category that consumes a disproportionate share of the budget (e.g., Housing > 30%).

        **Action**:
        - Generate a concise financial health summary.
        - Create a list of recommendations with estimated monthly savings.
        - Produce budget alerts for concerning patterns.
      `
      }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty OpenAI response');
  }

  const minifiedObject = aiInsightsSchema.parse(JSON.parse(content));

  // Expand back to full keys
  const object = {
    summary: minifiedObject.s,
    recommendations: minifiedObject.r.map(r => ({
      category: r.c,
      tip: r.t,
      potentialSavings: r.p
    })),
    budgetAlerts: minifiedObject.b
  };

  // 5. Store in DB
  const [savedInsight] = await db
    .insert(aiInsights)
    .values({
      userId: user.id,
      summary: object.summary,
      recommendations: object.recommendations,
      budgetAlerts: object.budgetAlerts,
      totalSpend: totalMonthlySpending.toString()
    })
    .returning();

  revalidatePath('/'); // Revalidate the dashboard

  return {
    ...savedInsight,
    recommendations: savedInsight.recommendations as InsightDataType['recommendations'],
    budgetAlerts: savedInsight.budgetAlerts as string[]
  };
}
