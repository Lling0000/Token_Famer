import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: '../../database/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://token_farmer:token_farmer@localhost:5433/token_farmer',
  },
  strict: true,
  verbose: true,
});
