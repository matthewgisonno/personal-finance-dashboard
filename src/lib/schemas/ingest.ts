import { z } from 'zod';

export const ingestSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      description: z.string(),
      amount: z.number()
    })
  ),
  accountId: z.string()
});

export type IngestInput = z.infer<typeof ingestSchema>;
