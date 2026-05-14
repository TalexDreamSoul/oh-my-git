import { z } from 'zod';

const Body = z.object({
  payload: z.record(z.string(), z.unknown())
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = Body.parse(await readBody(event));
  await putJson(event, `save:${user.id}`, { payload: body.payload, updated_at: new Date().toISOString() });
  return { ok: true };
});
