import { createHmac, timingSafeEqual } from 'node:crypto';

export const ACCESS_COOKIE = 'afb_access';
export const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 365; // one year

function secret() {
  const s = process.env.ACCESS_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error('ACCESS_TOKEN_SECRET is missing or too short (use at least 16 characters).');
  }
  return s;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createAccessToken({ ref, ttl = ACCESS_TTL_SECONDS } = {}) {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = b64url(JSON.stringify({ v: 1, exp, ref: ref || null }));
  return `${payload}.${sign(payload)}`;
}

export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected;
  try { expected = sign(payload); } catch { return null; }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.exp !== 'number') return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}
