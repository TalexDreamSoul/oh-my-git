import { z } from 'zod';
import { kv, requireUser } from '../../lib/kv';
import { VALID_LEVEL_ID_SET } from '../../game/levelIds';
import { jsonRequestErrorResponse, parseJsonBody } from '../../lib/request';

const TTL_SECONDS = 45;
const Body = z.object({
  levelId: z.string().min(1).max(128)
}).strict();

async function countOnline(levelId: string) {
  const namespace = await kv();
  if (!namespace.list) return null;
  const page = await namespace.list({ prefix: `presence:${levelId}:`, limit: 1000 });
  return page.keys.length;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const levelId = url.searchParams.get('levelId');
  if (!levelId) return Response.json({ error: 'Missing levelId' }, { status: 400 });
  if (!VALID_LEVEL_ID_SET.has(levelId)) return Response.json({ error: 'Unknown level.' }, { status: 400 });

  return Response.json({ levelId, online: await countOnline(levelId) });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody(request, Body, 2 * 1024);
    if (!VALID_LEVEL_ID_SET.has(body.levelId)) return Response.json({ error: 'Unknown level.' }, { status: 400 });

    await (await kv()).put(`presence:${body.levelId}:${user.id}`, String(Date.now()), { expirationTtl: TTL_SECONDS * 2 });
    return Response.json({ ok: true, online: await countOnline(body.levelId) });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
