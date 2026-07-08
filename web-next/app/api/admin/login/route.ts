import { z } from 'zod';
import { adminSecretStatus, createAdminSession, verifyAdminSecret } from '../../../lib/admin';
import { jsonRequestErrorResponse, parseJsonBody } from '../../../lib/request';

const Body = z.object({
  secret: z.string().min(1).max(512)
}).strict();

export async function GET() {
  return Response.json({ secretConfigured: adminSecretStatus().configured });
}

export async function POST(request: Request) {
  try {
    const status = adminSecretStatus();
    if (!status.configured) return Response.json({ error: 'ADMIN_SECRET 未配置或长度不足 32 位。' }, { status: 503 });

    const body = await parseJsonBody(request, Body, 1024);
    if (!(await verifyAdminSecret(body.secret))) return Response.json({ error: '管理员 Secret 错误。' }, { status: 401 });
    await createAdminSession();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
