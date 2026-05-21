import { cookies } from 'next/headers';
import { newId } from './kv';

const ADMIN_COOKIE = 'omg_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export function adminSecretStatus() {
  const secret = process.env.ADMIN_SECRET?.trim() || '';
  return { configured: secret.length >= 32, length: secret.length };
}

export function assertAdminSecretConfigured() {
  const status = adminSecretStatus();
  if (!status.configured) {
    throw new Response('ADMIN_SECRET must be at least 32 characters.', { status: 503 });
  }
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function sessionHash(token: string) {
  return sha256Hex(`${process.env.ADMIN_SECRET}:${token}`);
}

export async function createAdminSession() {
  assertAdminSecretConfigured();
  const token = newId('adm');
  const hash = await sessionHash(token);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, `${token}.${hash}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: ADMIN_SESSION_TTL_SECONDS });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated() {
  if (!adminSecretStatus().configured) return false;
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_COOKIE)?.value || '';
  const [token, hash] = raw.split('.');
  if (!token || !hash) return false;
  const expected = await sessionHash(token);
  return timingSafeEqual(expected, hash);
}

export async function requireAdmin() {
  assertAdminSecretConfigured();
  if (!(await isAdminAuthenticated())) throw new Response('Unauthorized', { status: 401 });
}

export async function verifyAdminSecret(secret: string) {
  assertAdminSecretConfigured();
  return timingSafeEqual(secret, process.env.ADMIN_SECRET || '');
}
