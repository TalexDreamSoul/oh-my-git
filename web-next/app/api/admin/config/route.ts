import { z } from 'zod';
import { requireAdmin } from '../../../lib/admin';
import { OAuthProviderId, oauthProviders, safeOAuthProvider, saveOAuthProvider } from '../../../lib/oauthConfig';

const Body = z.object({
  id: z.enum(['linuxdo', 'github', 'tuff-nexus']),
  label: z.string().trim().min(1).max(60),
  enabled: z.boolean().default(false),
  client_id: z.string().trim().default(''),
  client_secret: z.string().default(''),
  authorize_url: z.string().trim().default(''),
  token_url: z.string().trim().default(''),
  userinfo_url: z.string().trim().default(''),
  scope: z.string().trim().default('')
});

export async function GET() {
  await requireAdmin();
  const providers = await oauthProviders();
  return Response.json({ providers: providers.map(safeOAuthProvider), env: [] });
}

export async function PUT(request: Request) {
  await requireAdmin();
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: 'Invalid OAuth config.' }, { status: 400 });
  const existing = (await oauthProviders()).find((item) => item.id === parsed.data.id as OAuthProviderId);
  const clientSecret = parsed.data.client_secret.trim() || existing?.client_secret || '';
  const saved = await saveOAuthProvider({ ...parsed.data, client_secret: clientSecret });
  const providers = await oauthProviders();
  return Response.json({ ok: true, provider: saved ? safeOAuthProvider(saved) : null, providers: providers.map(safeOAuthProvider) });
}
