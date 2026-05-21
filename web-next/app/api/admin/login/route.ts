import { z } from 'zod';
import { adminSecretStatus, createAdminSession, verifyAdminSecret } from '../../../lib/admin';

const Body = z.object({ secret: z.string().min(1) });

export async function GET() {
  return Response.json({ secretConfigured: adminSecretStatus().configured });
}

export async function POST(request: Request) {
  const status = adminSecretStatus();
  if (!status.configured) return Response.json({ error: 'ADMIN_SECRET 未配置或长度不足 32 位。' }, { status: 503 });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: '请输入管理员 Secret。' }, { status: 400 });

  if (!(await verifyAdminSecret(parsed.data.secret))) return Response.json({ error: '管理员 Secret 错误。' }, { status: 401 });
  await createAdminSession();
  return Response.json({ ok: true });
}
