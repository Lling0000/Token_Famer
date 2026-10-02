import type { TokenPackage } from './game-types';

export function createDemoPackages(): TokenPackage[] {
  return [
    {
      id: 'demo-1',
      cropName: 'ChatGPT 花',
      modelId: 'gpt-5.4',
      amount: 2_880_000n,
      createdAt: '演示数据',
      source: 'harvest',
    },
    {
      id: 'demo-2',
      cropName: 'Claude 花',
      modelId: 'claude-sonnet-4-6',
      amount: 1_005_000n,
      createdAt: '演示数据',
      source: 'steal',
    },
  ];
}
