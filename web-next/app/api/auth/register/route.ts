import { z } from 'zod';
import { createPasswordUser, createSession, normalizePasswordAccount, publicUser } from '../../../lib/kv';

const Body = z.object({
  account: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(40).optional()
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: '账号需 3-32 位，仅支持字母、数字、下划线、短横线；密码至少 8 位。' }, { status: 400 });

  try {
    const account = normalizePasswordAccount(parsed.data.account);
    const user = await createPasswordUser({ ...parsed.data, account });
    await createSession(user.id);
    return Response.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    if (error instanceof Error && error.message === 'ACCOUNT_EXISTS') {
      return Response.json({ error: '该账号已存在，请直接登录。' }, { status: 409 });
    }
    return Response.json({ error: '注册失败，请稍后再试。' }, { status: 500 });
  }
}
