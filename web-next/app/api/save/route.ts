import { getJson, putJson, requireUser } from '../../lib/kv';
import { z } from 'zod';

const Body = z.object({
  payload: z.record(z.string(), z.unknown())
});

export async function GET() {
  const user = await requireUser();
  const row = await getJson<{ payload: unknown; updated_at: string }>(`save:${user.id}`);
  return Response.json({ save: row?.payload || null, updatedAt: row?.updated_at || null });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const body = Body.parse(await request.json());
  await putJson(`save:${user.id}`, { payload: body.payload, updated_at: new Date().toISOString() });
  return Response.json({ ok: true });
}
