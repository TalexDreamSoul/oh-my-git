import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cookies } from 'next/headers';

export type StoredUser = {
  id: string;
  provider: string;
  provider_user_id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
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
    created_at: existing?.created_at || now,
    updated_at: now
  };
  await putJson(`user:${id}`, user);
  await namespace.put(indexKey, id);
  return user;
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
