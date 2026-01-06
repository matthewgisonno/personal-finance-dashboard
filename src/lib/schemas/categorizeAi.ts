import z from 'zod';

export const categorizeAiInputSchema = z.object({
  transactions: z
    .array(
      z.object({
        id: z.string().describe('The ID of the transaction.'),
        description: z.string().describe('The description of the transaction.')
      })
    )
    .describe('The list of transactions to categorize.')
});

export const categorizeAiResponseSchema = z.object({
  categorizations: z
    .array(
      z.object({
        i: z.string().describe('The ID of the transaction.'),
        t: z.string().describe('The category of the transaction.'),
        n: z
          .number()
          .transform(n => Math.max(0, Math.min(1, n)))
          .describe('The confidence of the category.')
      })
    )
    .describe('The list of categorizations.')
});
