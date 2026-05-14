import { getJson, putJson, requireUser } from '../../lib/kv';

const TTL_SECONDS = 45;

type PresenceIndex = {
  users: Record<string, number>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const levelId = url.searchParams.get('levelId');
  if (!levelId) return Response.json({ error: 'Missing levelId' }, { status: 400 });

  const now = Date.now();
  const key = `presence:${levelId}`;
  const index = (await getJson<PresenceIndex>(key)) || { users: {} };
  const users = Object.fromEntries(Object.entries(index.users).filter(([, lastSeen]) => now - lastSeen < TTL_SECONDS * 1000));

  if (Object.keys(users).length !== Object.keys(index.users).length) {
    await putJson(key, { users }, { expirationTtl: TTL_SECONDS * 2 });
  }

  return Response.json({ levelId, online: Object.keys(users).length });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const levelId = typeof body.levelId === 'string' ? body.levelId : '';
  if (!levelId) return Response.json({ error: 'Missing levelId' }, { status: 400 });

  const now = Date.now();
  const key = `presence:${levelId}`;
  const index = (await getJson<PresenceIndex>(key)) || { users: {} };
  const users = Object.fromEntries(Object.entries(index.users).filter(([, lastSeen]) => now - lastSeen < TTL_SECONDS * 1000));
  users[user.id] = now;
  await putJson(key, { users }, { expirationTtl: TTL_SECONDS * 2 });
  return Response.json({ ok: true, online: Object.keys(users).length });
}
