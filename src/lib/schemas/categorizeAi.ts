import z from 'zod';

export const categorizeAiInputSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      description: z.string()
    })
  )
});

export type CategorizeAiInputType = z.infer<typeof categorizeAiInputSchema>;

export const categorizeAiResponseSchema = z.object({
  categorizations: z.array(
    z.object({
      i: z.string(),
      t: z.string(),
      n: z.number().transform(n => Math.max(0, Math.min(1, n)))
    })
  )
});
