import { z } from 'zod';

const Body = z.object({
  levelId: z.string().min(1),
  solved: z.boolean().default(true),
  score: z.number().int().min(0).max(100).optional(),
  timeSeconds: z.number().int().min(0).optional(),
  pureCli: z.boolean().default(false)
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = Body.parse(await readBody(event));
  await db()
    .prepare(
      `INSERT INTO progress (user_id, level_id, solved, best_score, best_time_seconds, pure_cli, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, level_id) DO UPDATE SET
         solved = excluded.solved,
         best_score = CASE WHEN progress.best_score IS NULL THEN excluded.best_score ELSE max(progress.best_score, excluded.best_score) END,
         best_time_seconds = CASE
           WHEN progress.best_time_seconds IS NULL THEN excluded.best_time_seconds
           WHEN excluded.best_time_seconds IS NULL THEN progress.best_time_seconds
           ELSE min(progress.best_time_seconds, excluded.best_time_seconds)
         END,
         pure_cli = max(progress.pure_cli, excluded.pure_cli),
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(user.id, body.levelId, body.solved ? 1 : 0, body.score ?? null, body.timeSeconds ?? null, body.pureCli ? 1 : 0)
    .run();
  return { ok: true };
});
