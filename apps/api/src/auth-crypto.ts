import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt:${salt.toString('base64url')}:${derived.toString('base64url')}`;
};

export const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
  const [algorithm, saltText, expectedText] = encoded.split(':');
  if (algorithm !== 'scrypt' || !saltText || !expectedText) return false;
  const expected = Buffer.from(expectedText, 'base64url');
  const actual = (await scrypt(
    password,
    Buffer.from(saltText, 'base64url'),
    expected.length,
  )) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const encodeBase32 = (source: Buffer): string => {
  let bits = '';
  for (const byte of source) bits += byte.toString(2).padStart(8, '0');
  let encoded = '';
  for (let index = 0; index < bits.length; index += 5) {
    const segment = bits.slice(index, index + 5).padEnd(5, '0');
    encoded += base32Alphabet[Number.parseInt(segment, 2)];
  }
  return encoded;
};

const decodeBase32 = (encoded: string): Buffer => {
  let bits = '';
  for (const character of encoded.replace(/=+$/, '').toUpperCase()) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new Error('Invalid TOTP secret');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
};

const totpAtCounter = (secret: string, counter: bigint): string => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return binary.toString().padStart(6, '0');
};

export const createTotpSecret = (): string => encodeBase32(randomBytes(20));

export const verifyTotp = (code: string, secret: string, now: Date): boolean => {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = BigInt(Math.floor(now.getTime() / 30_000));
  return [-1n, 0n, 1n].some((offset) => totpAtCounter(secret, counter + offset) === code);
};
