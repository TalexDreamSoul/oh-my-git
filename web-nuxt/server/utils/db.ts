type CloudflareEvent = {
  context: {
    cloudflare?: {
      env?: Record<string, any>;
    };
  };
};

export function kv(event: CloudflareEvent) {
  const namespace = event.context.cloudflare?.env?.KV || event.context.cloudflare?.env?.oh_my_git_web_kv;
  if (!namespace) throw createError({ statusCode: 500, statusMessage: 'Missing Cloudflare KV binding' });
  return namespace as KVNamespace;
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}

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

export async function getJson<T>(event: CloudflareEvent, key: string): Promise<T | null> {
  const value = await kv(event).get(key);
  return value ? (JSON.parse(value) as T) : null;
}

export async function putJson(event: CloudflareEvent, key: string, value: unknown, options?: { expirationTtl?: number }) {
  await kv(event).put(key, JSON.stringify(value), options);
}

export async function currentUser(event: any) {
  const token = getCookie(event, 'omg_session');
  if (!token) return null;
  const session = await getJson<StoredSession>(event, `session:${token}`);
  if (!session || session.expires_at < Date.now()) return null;
  return getJson<StoredUser>(event, `user:${session.user_id}`);
}

export async function requireUser(event: any) {
  const user = await currentUser(event);
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  return user;
}

export async function upsertOAuthUser(event: any, input: Omit<StoredUser, 'id' | 'created_at' | 'updated_at'>) {
  const indexKey = `oauth:${input.provider}:${input.provider_user_id}`;
  const existingId = await kv(event).get(indexKey);
  const now = new Date().toISOString();
  const id = existingId || newId('usr');
  const existing = existingId ? await getJson<StoredUser>(event, `user:${existingId}`) : null;
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
  await putJson(event, `user:${id}`, user);
  await kv(event).put(indexKey, id);
  return user;
}

export async function createSession(event: any, userId: string) {
  const token = newId('ses');
  const ttl = 60 * 60 * 24 * 30;
  const session: StoredSession = {
    token,
    user_id: userId,
    expires_at: Date.now() + ttl * 1000,
    created_at: new Date().toISOString()
  };
  await putJson(event, `session:${token}`, session, { expirationTtl: ttl });
  setCookie(event, 'omg_session', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: ttl });
  return token;
}
