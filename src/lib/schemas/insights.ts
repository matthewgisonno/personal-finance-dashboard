import { z } from 'zod';

export const aiInsightsSchema = z.object({
  s: z.string().describe("A brief 1-sentence summary of the user's financial health."),
  r: z
    .array(
      z
        .object({
          c: z.string().describe('The category of the spending.'),
          t: z.string().describe('A specific, actionable tip to save money in this category.'),
          p: z.number().describe('Estimated monthly savings if tip is followed.')
        })
        .describe('A recommendation to save money in a specific category.')
    )
    .describe('A list of recommendations to save money in specific categories.'),
  b: z.array(z.string()).describe('Warnings about categories that seem disproportionately high.')
});
