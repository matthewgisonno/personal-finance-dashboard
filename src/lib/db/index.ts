import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Validate environment
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Create Neon client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance with schema for relational queries
export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export * from './schema';
