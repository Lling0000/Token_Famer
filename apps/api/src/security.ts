import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

export const hashSecret = (secret: string, pepper: string): string =>
  createHmac('sha256', pepper).update(secret).digest('hex');

export const createApiKey = (pepper: string) => {
  const secret = randomBytes(32).toString('base64url');
  const prefix = `sk-tf-${secret.slice(0, 10)}`;
  const value = `${prefix}.${secret}`;
  return { value, prefix, hash: hashSecret(value, pepper) };
};

const encryptionKey = (source: string): Buffer =>
  createHmac('sha256', 'token-farmer-field-key').update(source).digest();

export const encryptField = (plaintext: string, keySource: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(keySource), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
};

export const decryptField = (encoded: string, keySource: string): string => {
  const [ivText, tagText, ciphertextText] = encoded.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted field');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(keySource),
    Buffer.from(ivText, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};
