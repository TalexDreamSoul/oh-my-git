import { getJson, putJson, requireUser } from '../../lib/kv';
import { z } from 'zod';

const Body = z.object({
  levelId: z.string().min(1),
  solved: z.boolean().default(true),
  score: z.number().int().min(0).max(100).optional(),
  timeSeconds: z.number().int().min(0).optional(),
  pureCli: z.boolean().default(false)
});

export async function GET() {
  const user = await requireUser();
  const progress = (await getJson<any[]>(`progress:${user.id}`)) || [];
  return Response.json({ progress });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = Body.parse(await request.json());
  const key = `progress:${user.id}`;
  const progress = (await getJson<any[]>(key)) || [];
  const existing = progress.find((item) => item.level_id === body.levelId);
  const next = {
    level_id: body.levelId,
    solved: body.solved ? 1 : 0,
    best_score: existing?.best_score == null ? body.score ?? null : Math.max(existing.best_score, body.score ?? 0),
    best_time_seconds:
      existing?.best_time_seconds == null
        ? body.timeSeconds ?? null
        : body.timeSeconds == null
          ? existing.best_time_seconds
          : Math.min(existing.best_time_seconds, body.timeSeconds),
    pure_cli: Math.max(existing?.pure_cli ?? 0, body.pureCli ? 1 : 0),
    updated_at: new Date().toISOString()
  };
  const updated = existing ? progress.map((item) => (item.level_id === body.levelId ? next : item)) : [...progress, next];
  await putJson(key, updated);
  return Response.json({ ok: true });
}
