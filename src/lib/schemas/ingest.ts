import { z } from 'zod';

export const ingestSchema = z.object({
  transactions: z.array(
    z
      .object({
        id: z.string().describe('The ID of the transaction.'),
        date: z.string().describe('The date of the transaction.'),
        description: z.string().describe('The description of the transaction.'),
        amount: z.number().describe('The amount of the transaction.')
      })
      .describe('The list of transactions to ingest.')
  ),
  accountId: z.string().describe('The ID of the account.')
});
