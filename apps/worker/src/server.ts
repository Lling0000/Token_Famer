import { createServer } from 'node:http';

import { Queue, Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6380';
const port = Number.parseInt(process.env.WORKER_HEALTH_PORT ?? '4100', 10);
const parsedRedisUrl = new URL(redisUrl);
const connection = {
  host: parsedRedisUrl.hostname,
  port: Number.parseInt(parsedRedisUrl.port || '6379', 10),
  maxRetriesPerRequest: null,
};
const queue = new Queue('token-farmer-maintenance', { connection });
const worker = new Worker(
  'token-farmer-maintenance',
  async (job) => ({ processedAt: new Date().toISOString(), job: job.name }),
  { connection, concurrency: 2 },
);

await queue.upsertJobScheduler(
  'projection-heartbeat-v1',
  { every: 60_000 },
  { name: 'projection-heartbeat', data: { version: 1 } },
);

const health = createServer((_request, response) => {
  response.writeHead(worker.isRunning() ? 200 : 503, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ status: worker.isRunning() ? 'ready' : 'stopped' }));
});
health.listen(port, '0.0.0.0');

const close = async (): Promise<void> => {
  health.close();
  await worker.close();
  await queue.close();
};

process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
