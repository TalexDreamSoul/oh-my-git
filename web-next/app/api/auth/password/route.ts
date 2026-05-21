import { z } from 'zod';
import { createSession, publicUser, verifyPasswordUser } from '../../../lib/kv';

const Body = z.object({
  account: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128)
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: '请输入账号和密码。' }, { status: 400 });

  const user = await verifyPasswordUser(parsed.data.account, parsed.data.password);
  if (!user) return Response.json({ error: '账号或密码错误。' }, { status: 401 });

  await createSession(user.id);
  return Response.json({ ok: true, user: publicUser(user) });
}
