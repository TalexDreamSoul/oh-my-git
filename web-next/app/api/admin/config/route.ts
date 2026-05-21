import { requireAdmin } from '../../../lib/admin';
import { oauthProviders } from '../../../lib/oauthConfig';

function masked(value?: string) {
  const text = value?.trim() || '';
  if (!text) return '';
  if (text.length <= 8) return '********';
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function envInfo(name: string, secret = false) {
  const value = process.env[name]?.trim() || '';
  return { name, configured: Boolean(value), value: secret ? masked(value) : value };
}

export async function GET() {
  await requireAdmin();
  return Response.json({
    providers: oauthProviders(),
    env: [
      envInfo('NEXT_PUBLIC_OAUTH_REDIRECT_BASE'),
      envInfo('NEXT_PUBLIC_LINUXDO_CLIENT_ID'),
      envInfo('LINUXDO_CLIENT_SECRET', true),
      envInfo('NEXT_PUBLIC_GITHUB_CLIENT_ID'),
      envInfo('GITHUB_CLIENT_SECRET', true),
      envInfo('NEXT_PUBLIC_TUFF_NEXUS_CLIENT_ID'),
      envInfo('TUFF_NEXUS_CLIENT_SECRET', true),
      envInfo('TUFF_NEXUS_AUTHORIZE_URL'),
      envInfo('TUFF_NEXUS_TOKEN_URL'),
      envInfo('TUFF_NEXUS_USERINFO_URL'),
      envInfo('TUFF_NEXUS_SCOPE')
    ]
  });
}
