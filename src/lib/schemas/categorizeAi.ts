import z from 'zod';

export const categorizeAiSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      description: z.string()
    })
  )
});

export type CategorizeAiInput = z.infer<typeof categorizeAiSchema>;
