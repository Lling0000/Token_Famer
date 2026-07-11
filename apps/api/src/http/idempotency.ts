export const requireIdempotencyKey = (headers: Readonly<Record<string, unknown>>): string => {
  const value = headers['idempotency-key'];
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new Error('Idempotency-Key header must contain between 8 and 128 characters');
  }
  return value;
};
