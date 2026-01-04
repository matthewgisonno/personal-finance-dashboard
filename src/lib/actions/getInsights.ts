'use server';

import { generateObject } from 'ai';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getExpenseCategoryData } from '@/lib/actions/getExpenseCategoryData';
import { db, aiInsights } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

// Schema for the AI's response
const insightSchema = z.object({
  summary: z.string().describe("A brief 1-sentence summary of the user's financial health."),
  recommendations: z.array(
    z.object({
      category: z.string(),
      tip: z.string().describe('A specific, actionable tip to save money in this category.'),
      potentialSavings: z.number().describe('Estimated monthly savings if tip is followed.')
    })
  ),
  budgetAlerts: z.array(z.string()).describe('Warnings about categories that seem disproportionately high.')
});

export type InsightData = {
  id: string;
  generatedAt: Date;
  summary: string;
  recommendations: {
    category: string;
    tip: string;
    potentialSavings: number;
  }[];
  budgetAlerts: string[];
  totalSpend: string | null;
};

export async function getLatestInsight(): Promise<InsightData | null> {
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
    recommendations: latestInsight.recommendations as InsightData['recommendations'],
    budgetAlerts: latestInsight.budgetAlerts as string[]
  };
}

export async function getInsightHistory(): Promise<InsightData[]> {
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
    recommendations: item.recommendations as InsightData['recommendations'],
    budgetAlerts: item.budgetAlerts as string[]
  }));
}

export async function generateInsightsAction(force: boolean = false): Promise<InsightData | null> {
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
        recommendations: latestInsight.recommendations as InsightData['recommendations'],
        budgetAlerts: latestInsight.budgetAlerts as string[]
      };
    }
  }

  // 2. Fetch Aggregated Data (Last 30 Days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const categoryData = await getExpenseCategoryData({
    startDate,
    endDate
  });

  if (!categoryData || categoryData.length === 0) {
    return null;
  }

  // 3. Anonymize the payload
  const contextPayload = categoryData.map(item => ({
    category: item.category,
    amount: item.amount
  }));

  const totalMonthlySpending = contextPayload.reduce((a, b) => a + b.amount, 0);

  // 4. Generate Insights
  const { object } = await generateObject({
    model: 'openai/gpt-4o-mini',
    schema: insightSchema,
    prompt: `
        Analyze this monthly spending distribution using the CLEAR framework:

        **Context**:
        - Total Spending (Last 30 Days): ${formatCurrency(totalMonthlySpending)}
        - Category Breakdown: ${JSON.stringify(contextPayload)}

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

        **Role**:
        - You are an empathetic, practical financial advisor helping the user improve their financial health.
      `
  });

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
    recommendations: savedInsight.recommendations as InsightData['recommendations'],
    budgetAlerts: savedInsight.budgetAlerts as string[]
  };
}
