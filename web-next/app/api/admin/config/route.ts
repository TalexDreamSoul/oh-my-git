import { z } from 'zod';
import { requireAdmin } from '../../../lib/admin';
import { OAuthProviderId, oauthProviders, safeOAuthProvider, saveOAuthProvider } from '../../../lib/oauthConfig';
import { jsonRequestErrorResponse, parseJsonBody } from '../../../lib/request';

const Body = z.object({
  id: z.enum(['linuxdo', 'github', 'tuff-nexus']),
  label: z.string().trim().min(1).max(60),
  enabled: z.boolean().default(false),
  client_id: z.string().trim().max(256).default(''),
  client_secret: z.string().max(1024).default(''),
  authorize_url: z.string().trim().max(512).default(''),
  token_url: z.string().trim().max(512).default(''),
  userinfo_url: z.string().trim().max(512).default(''),
  scope: z.string().trim().max(256).default('')
}).strict();

export async function GET() {
  await requireAdmin();
  const providers = await oauthProviders();
  return Response.json({ providers: providers.map(safeOAuthProvider), env: [] });
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await parseJsonBody(request, Body, 8 * 1024);
    const existing = (await oauthProviders()).find((item) => item.id === body.id as OAuthProviderId);
    const clientSecret = body.client_secret.trim() || existing?.client_secret || '';
    const saved = await saveOAuthProvider({ ...body, client_secret: clientSecret });
    const providers = await oauthProviders();
    return Response.json({ ok: true, provider: saved ? safeOAuthProvider(saved) : null, providers: providers.map(safeOAuthProvider) });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
