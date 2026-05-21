import { z } from 'zod';
import { publicUser, requireUser, updateUserProfile } from '../../../lib/kv';

const Body = z.object({
  name: z.string().trim().min(1).max(40)
});

export async function PATCH(request: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: '显示名称不能为空，且最多 40 个字符。' }, { status: 400 });

  const updated = await updateUserProfile(user.id, { name: parsed.data.name });
  if (!updated) return Response.json({ error: '用户不存在。' }, { status: 404 });
  return Response.json({ ok: true, user: publicUser(updated) });
}
