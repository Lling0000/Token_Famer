import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  BETTER_AUTH_SECRET: z.string().min(32),
  API_KEY_PEPPER: z.string().min(16),
  FIELD_ENCRYPTION_KEY: z.string().min(16),
  UPSTREAM_MODE: z.enum(['mock', 'new-api', 'teamorouter']).default('mock'),
  TEAMOROUTER_RESALE_APPROVED: z.enum(['true', 'false']).default('false'),
  TEAMOROUTER_BASE_URL: z.string().url().default('https://api.teamorouter.com/v1'),
  TEAMOROUTER_API_KEY: z.string().optional(),
  GAME_TIME_SCALE: z.coerce.number().positive().default(60),
});

export type AppConfig = z.infer<typeof configSchema>;

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): AppConfig => {
  const config = configSchema.parse(environment);
  if (config.UPSTREAM_MODE === 'teamorouter' && config.TEAMOROUTER_RESALE_APPROVED !== 'true') {
    throw new Error('TeamoRouter mode requires explicit resale approval');
  }
  if (config.UPSTREAM_MODE === 'teamorouter' && !config.TEAMOROUTER_API_KEY) {
    throw new Error('TeamoRouter mode requires a server-side API key');
  }
  return config;
};
