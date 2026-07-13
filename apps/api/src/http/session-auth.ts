import { and, eq, gt } from 'drizzle-orm';

import type { Database } from '@token-farmer/db-runtime';
import { sessions, users } from '@token-farmer/db-runtime/internal/schema';

import type { AppConfig } from '../config';
import { hashSecret } from '../security';

export const SESSION_COOKIE = 'tf_session';

export interface AuthenticatedSession {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  expiresAt: Date;
}

export const readSessionToken = (cookieHeader: string | undefined): string | null => {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(valueParts.join('='));
  }
  return null;
};

export const resolveSession = async (
  db: Database,
  config: AppConfig,
  cookieHeader: string | undefined,
  now: Date,
): Promise<AuthenticatedSession | null> => {
  const token = readSessionToken(cookieHeader);
  if (!token) return null;
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.tokenHash, hashSecret(token, config.BETTER_AUTH_SECRET)),
      gt(sessions.expiresAt, now),
      eq(sessions.twoFactorVerified, true),
    ),
  });
  if (!session) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user || user.status !== 'active') return null;
  return {
    id: session.id,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    expiresAt: session.expiresAt,
  };
};

const secureAttribute = (secure: boolean): string => (secure ? '; Secure' : '');

export const sessionCookie = (token: string, maxAgeSeconds: number, secure: boolean): string =>
  `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secureAttribute(secure)}`;

export const expiredSessionCookie = (secure: boolean): string =>
  `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureAttribute(secure)}`;
