import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.SUPABASE_DB_URL! },
  strict: true,
  verbose: true,
} satisfies Config;
