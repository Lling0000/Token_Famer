import { describe, expect, it } from 'vitest';

import { expiredSessionCookie, readSessionToken, sessionCookie } from './session-auth';

describe('session cookies', () => {
  it('keeps the session token HttpOnly and applies Secure only for HTTPS delivery', () => {
    const httpCookie = sessionCookie('token value', 60, false);
    const httpsCookie = sessionCookie('token value', 60, true);

    expect(httpCookie).toContain('tf_session=token%20value');
    expect(httpCookie).toContain('HttpOnly; SameSite=Lax; Path=/; Max-Age=60');
    expect(httpCookie).not.toContain('Secure');
    expect(httpsCookie).toContain('; Secure');
    expect(expiredSessionCookie(true)).toContain('Max-Age=0; Secure');
  });

  it('reads only the named session cookie', () => {
    expect(readSessionToken('theme=dark; tf_session=token%20value; locale=zh')).toBe('token value');
    expect(readSessionToken('theme=dark')).toBeNull();
  });
});
