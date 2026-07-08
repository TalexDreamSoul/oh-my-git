import { z } from 'zod';
import { requireAdmin } from '../../../lib/admin';
import { getJson, kv, putJson } from '../../../lib/kv';
import { boundedIntParam, jsonRequestErrorResponse, parseJsonBody } from '../../../lib/request';

type Collection = 'users' | 'progress' | 'saves' | 'achievements' | 'sessions' | 'season-leaderboard';

const COLLECTIONS: Record<Collection, { prefix: string; label: string }> = {
  users: { prefix: 'user:', label: '用户' },
  progress: { prefix: 'progress:', label: '进度' },
  saves: { prefix: 'save:', label: '存档' },
  achievements: { prefix: 'achievements:', label: '成就' },
  sessions: { prefix: 'session:', label: '会话' },
  'season-leaderboard': { prefix: 'season-leaderboard:', label: '赛季排行' }
};

const collectionValues = ['users', 'progress', 'saves', 'achievements', 'sessions', 'season-leaderboard'] as const;
const PostBody = z.object({ collection: z.enum(collectionValues), key: z.string().min(1).max(256), value: z.unknown() }).strict();
const PutBody = z.object({ key: z.string().min(1).max(256), value: z.unknown() }).strict();

function collectionFromRequest(request: Request): Collection {
  const url = new URL(request.url);
  const collection = url.searchParams.get('collection') || 'users';
  if (!(collection in COLLECTIONS)) throw new Response('Unknown collection', { status: 400 });
  return collection as Collection;
}

async function listKeys(prefix: string, limit = 200) {
  const namespace = await kv();
  if (!namespace.list) return [];
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await namespace.list({ prefix, limit: Math.min(1000, limit - keys.length), cursor });
    keys.push(...page.keys.map((key) => key.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && keys.length < limit);
  return keys;
}

function toStorageKey(collection: Collection, key: string) {
  const prefix = COLLECTIONS[collection].prefix;
  return key.startsWith(prefix) ? key : `${prefix}${key}`;
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const collection = collectionFromRequest(request);
  const prefix = COLLECTIONS[collection].prefix;
  const limit = boundedIntParam(url.searchParams.get('limit'), 100, 1, 500);
  const keys = await listKeys(prefix, limit);
  const rows = await Promise.all(keys.map(async (key) => ({ key, value: await getJson<unknown>(key) })));
  return Response.json({ collection, meta: COLLECTIONS[collection], rows });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await parseJsonBody(request, PostBody, 64 * 1024);
    const key = toStorageKey(body.collection, body.key);
    await putJson(key, body.value);
    return Response.json({ ok: true, key });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const collection = collectionFromRequest(request);
    const body = await parseJsonBody(request, PutBody, 64 * 1024);
    const key = toStorageKey(collection, body.key);
    await putJson(key, body.value);
    return Response.json({ ok: true, key });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const collection = collectionFromRequest(request);
  const key = url.searchParams.get('key') || '';
  if (!key) return Response.json({ error: 'Missing key.' }, { status: 400 });
  await (await kv()).delete(toStorageKey(collection, key));
  return Response.json({ ok: true });
}
