import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cookies } from 'next/headers';

export type StoredUser = {
  id: string;
  provider: string;
  provider_user_id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  password_hash?: string | null;
  password_salt?: string | null;
  created_at: string;
  updated_at: string;
};

export type StoredSession = {
  token: string;
  user_id: string;
  expires_at: number;
  created_at: string;
};

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}

const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_PEPPER = 'oh-my-git-web-password-v1';

export function normalizePasswordAccount(account: string) {
  return account.trim().toLowerCase();
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bytesToHex(new Uint8Array(digest));
}

async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex || bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  let hash = `${PASSWORD_PEPPER}:${salt}:${password}`;
  for (let index = 0; index < PASSWORD_ITERATIONS; index += 1) hash = await sha256Hex(hash);
  return { salt, hash };
}

export async function kv() {
  const context = await getCloudflareContext({ async: true });
  const namespace = context.env.KV as KVNamespace | undefined;
  if (!namespace) throw new Error('Missing Cloudflare KV binding');
  return namespace;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const value = await (await kv()).get(key);
  return value ? (JSON.parse(value) as T) : null;
}

export async function putJson(key: string, value: unknown, options?: { expirationTtl?: number }) {
  await (await kv()).put(key, JSON.stringify(value), options);
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('omg_session')?.value;
  if (!token) return null;
  const session = await getJson<StoredSession>(`session:${token}`);
  if (!session || session.expires_at < Date.now()) return null;
  return getJson<StoredUser>(`user:${session.user_id}`);
}

export function publicUser(user: StoredUser) {
  const { password_hash: _passwordHash, password_salt: _passwordSalt, ...safeUser } = user;
  return safeUser;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return user;
}

export async function upsertOAuthUser(input: Omit<StoredUser, 'id' | 'created_at' | 'updated_at'>) {
  const namespace = await kv();
  const indexKey = `oauth:${input.provider}:${input.provider_user_id}`;
  const existingId = await namespace.get(indexKey);
  const now = new Date().toISOString();
  const id = existingId || newId('usr');
  const existing = existingId ? await getJson<StoredUser>(`user:${existingId}`) : null;
  const user: StoredUser = {
    id,
    provider: input.provider,
    provider_user_id: input.provider_user_id,
    name: input.name,
    email: input.email || null,
    avatar_url: input.avatar_url || null,
    password_hash: existing?.password_hash || null,
    password_salt: existing?.password_salt || null,
    created_at: existing?.created_at || now,
    updated_at: now
  };
  await putJson(`user:${id}`, user);
  await namespace.put(indexKey, id);
  return user;
}

export async function createPasswordUser(input: { account: string; password: string; name?: string }) {
  const namespace = await kv();
  const account = normalizePasswordAccount(input.account);
  const indexKey = `password-user:${account}`;
  const existingId = await namespace.get(indexKey);
  if (existingId) throw new Error('ACCOUNT_EXISTS');

  const now = new Date().toISOString();
  const id = newId('usr');
  const password = await hashPassword(input.password);
  const user: StoredUser = {
    id,
    provider: 'password',
    provider_user_id: account,
    name: input.name?.trim() || input.account.trim(),
    email: null,
    avatar_url: null,
    password_hash: password.hash,
    password_salt: password.salt,
    created_at: now,
    updated_at: now
  };
  await putJson(`user:${id}`, user);
  await namespace.put(indexKey, id);
  return user;
}

export async function verifyPasswordUser(accountInput: string, passwordInput: string) {
  const namespace = await kv();
  const account = normalizePasswordAccount(accountInput);
  const userId = await namespace.get(`password-user:${account}`);
  if (!userId) return null;
  const user = await getJson<StoredUser>(`user:${userId}`);
  if (!user?.password_hash || !user.password_salt) return null;
  const candidate = await hashPassword(passwordInput, user.password_salt);
  return timingSafeEqual(candidate.hash, user.password_hash) ? user : null;
}

export async function updateUserProfile(userId: string, input: { name?: string }) {
  const user = await getJson<StoredUser>(`user:${userId}`);
  if (!user) return null;
  const next: StoredUser = {
    ...user,
    name: input.name?.trim() || user.name,
    updated_at: new Date().toISOString()
  };
  await putJson(`user:${userId}`, next);
  return next;
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const token = newId('ses');
  const ttl = 60 * 60 * 24 * 30;
  const session: StoredSession = {
    token,
    user_id: userId,
    expires_at: Date.now() + ttl * 1000,
    created_at: new Date().toISOString()
  };
  await putJson(`session:${token}`, session, { expirationTtl: ttl });
  cookieStore.set('omg_session', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: ttl });
  return token;
}
