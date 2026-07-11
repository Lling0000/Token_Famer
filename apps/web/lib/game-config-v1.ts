export const GAME_CONFIG_V1 = {
  version: '2026-07-11.1',
  hash: 'demo-economy-20260711-a',
  dailyTasks: [
    { id: 'plant', rewardToken: 80_000n, rewardIntimacy: 0 },
    { id: 'harvest', rewardToken: 120_000n, rewardIntimacy: 0 },
    { id: 'friend', rewardToken: 60_000n, rewardIntimacy: 20 },
  ],
  nextCheckinRewardToken: 50_000n,
  weeklyRewardToken: 500_000n,
  dogFood: [
    { id: 'dog-food-1d', name: '田园肉骨头', durationHours: 24, priceToken: 180_000n },
    { id: 'dog-food-3d', name: '营养狗粮袋', durationHours: 72, priceToken: 480_000n },
    { id: 'dog-food-7d', name: '守护大礼包', durationHours: 168, priceToken: 980_000n },
  ],
  decorations: [
    { id: 'lantern-line', name: '暖光灯串', priceToken: 360_000n },
    { id: 'flower-flags', name: '花田风旗', priceToken: 420_000n },
  ],
} as const;

export function getDailyTaskReward(taskId: string) {
  return GAME_CONFIG_V1.dailyTasks.find((task) => task.id === taskId);
}
