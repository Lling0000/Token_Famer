export type LeaderboardBoard = 'harvest' | 'consumption' | 'holdings';
export type LeaderboardPeriod = 'day' | 'week' | 'all';

export interface ValueComponent {
  amount: bigint;
  inputPriceMicrosPerMillion: bigint;
}

export const calculateTokenScore = (components: readonly ValueComponent[]): bigint =>
  components.reduce(
    (score, component) =>
      score + (component.amount * component.inputPriceMicrosPerMillion) / 1_000_000n,
    0n,
  );
