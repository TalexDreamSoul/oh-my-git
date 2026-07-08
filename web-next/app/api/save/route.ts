import { z } from 'zod';
import { getJson, putJson, requireUser } from '../../lib/kv';
import { VALID_LEVEL_ID_SET } from '../../game/levelIds';
import { jsonRequestErrorResponse, parseJsonBody } from '../../lib/request';

const SavePayload = z.object({
  version: z.literal(1),
  currentLevelId: z.string().min(1).max(128).refine((levelId) => VALID_LEVEL_ID_SET.has(levelId), 'Unknown level.').optional(),
  settings: z.object({
    theme: z.enum(['dark', 'light']),
    soundEnabled: z.boolean(),
    terminalHeight: z.number().int().min(180).max(720)
  }).strict().optional(),
  clientRevision: z.number().int().min(0).optional()
}).strict();

const Body = z.object({
  payload: SavePayload
}).strict();

export async function GET() {
  const user = await requireUser();
  const row = await getJson<{ payload: unknown; updated_at: string }>(`save:${user.id}`);
  return Response.json({ save: row?.payload || null, updatedAt: row?.updated_at || null });
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody(request, Body, 16 * 1024);
    await putJson(`save:${user.id}`, { payload: body.payload, updated_at: new Date().toISOString() });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
