import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDatabase } from '../src/client';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://token_farmer:token_farmer@localhost:5433/token_farmer';

const { db, sql } = createDatabase(databaseUrl);
await migrate(db, { migrationsFolder: '../../database/migrations' });
await sql.end();
