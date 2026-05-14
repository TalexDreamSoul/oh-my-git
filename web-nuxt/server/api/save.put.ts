import { z } from 'zod';

const Body = z.object({
  payload: z.record(z.string(), z.unknown())
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = Body.parse(await readBody(event));
  await db()
    .prepare(
      `INSERT INTO saves (user_id, payload, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`
    )
    .bind(user.id, JSON.stringify(body.payload))
    .run();
  return { ok: true };
});
