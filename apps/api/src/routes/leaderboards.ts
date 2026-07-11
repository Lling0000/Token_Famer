import type { FastifyInstance } from 'fastify';

const farmers = [
  ['PixelLin', 15, '9884200'],
  ['MeiMei', 13, '8720100'],
  ['NoraByte', 12, '7195300'],
  ['Token Farmer', 1, '80000'],
  ['Kai', 9, '70400'],
] as const;

export const registerLeaderboardRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/leaderboards', async (request) => {
    const query = request.query as { board?: string; period?: string; scope?: string };
    return {
      board: query.board ?? 'harvest',
      period: query.period ?? 'day',
      scope: query.scope ?? 'global',
      entries: farmers.map(([displayName, level, score], index) => ({
        rank: index + 1,
        userId: `rank-${index + 1}`,
        displayName,
        level,
        score,
        isCurrentUser: displayName === 'Token Farmer',
      })),
    };
  });
};
