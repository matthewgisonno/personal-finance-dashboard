import { generateObject } from 'ai';
import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getExpenseCategoryData } from '@/lib/actions/getExpenseCategoryData';
import { db, aiInsights } from '@/lib/db';

export const maxDuration = 60;

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

export async function POST(req: Request) {
  try {
    // MOCK: Get current user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    // Parse optional "force" flag from request body
    const body = await req.json().catch(() => ({}));
    const { force } = body;

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
        return NextResponse.json({
          ...latestInsight,
          recommendations: latestInsight.recommendations,
          budgetAlerts: latestInsight.budgetAlerts
        });
      }
    }

    // 2. Fetch Aggregated Data (Last 30 Days)
    // We filter for the last 30 days so the "Monthly" insights are accurate.
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const categoryData = await getExpenseCategoryData({
      startDate,
      endDate
    });

    if (!categoryData || categoryData.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found. Please upload transactions to generate insights.' },
        { status: 404 }
      );
    }

    // 3. Anonymize the payload
    // We strictly send { category: string, amount: number }
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
        - Total Spending (Last 30 Days): $${totalMonthlySpending.toFixed(2)}
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

    return NextResponse.json(savedInsight);
  } catch (error) {
    console.error('Insight Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // MOCK: Get current user
    const user = await db.query.users.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    const history = await db.query.aiInsights.findMany({
      where: eq(aiInsights.userId, user.id),
      orderBy: [desc(aiInsights.generatedAt)],
      limit: 10 // Limit to last 10 for now
    });
    return NextResponse.json(history);
  } catch (error) {
    console.error('Insight History Error:', error);
    return NextResponse.json({ error: 'Failed to fetch insight history' }, { status: 500 });
  }
}
