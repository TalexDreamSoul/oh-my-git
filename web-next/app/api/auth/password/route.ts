import { z } from 'zod';
import { createSession, publicUser, recordTermsAcceptance, verifyPasswordUser } from '../../../lib/kv';

const CURRENT_TERMS_VERSION = 1;

const Body = z.object({
  account: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
  termsVersion: z.number().int().min(CURRENT_TERMS_VERSION)
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: '请输入账号和密码。' }, { status: 400 });

  const user = await verifyPasswordUser(parsed.data.account, parsed.data.password);
  if (!user) return Response.json({ error: '账号或密码错误。' }, { status: 401 });

  const updatedUser = await recordTermsAcceptance(user.id, parsed.data.termsVersion);
  await createSession(user.id);
  return Response.json({ ok: true, user: publicUser(updatedUser || user) });
}
