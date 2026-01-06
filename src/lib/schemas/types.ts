import { z } from 'zod';

import { categorizeAiInputSchema } from './categorizeAi';
import { ingestSchema } from './ingest';

export type CategorizeAiInputType = z.infer<typeof categorizeAiInputSchema>;

export type IngestInputType = z.infer<typeof ingestSchema>;
