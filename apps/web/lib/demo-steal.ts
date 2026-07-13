export function sampleBasisPoints(): number {
  return (crypto.getRandomValues(new Uint16Array(1))[0] ?? 0) % 10_000;
}

export function stealAmount(seedCost: bigint, roll: number): bigint {
  if (roll < 5_500) return maxBigInt(1n, (seedCost * 5n) / 1_000n);
  if (roll < 8_500) return maxBigInt(1n, seedCost / 100n);
  if (roll < 9_700) return maxBigInt(1n, (seedCost * 2n) / 100n);
  return maxBigInt(1n, (seedCost * 5n) / 100n);
}

export function formatStealAmount(amount: bigint): string {
  return amount >= 1_000n ? `${amount / 1_000n}K` : amount.toString();
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
