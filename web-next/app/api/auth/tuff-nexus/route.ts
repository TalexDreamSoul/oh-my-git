import { cookies } from 'next/headers';
import { oauthProviderById } from '../../../lib/oauthConfig';

export async function GET(request: Request) {
  const config = oauthProviderById('tuff-nexus');
  if (!config?.enabled) return Response.json({ error: 'Tuff Nexus OAuth is not configured' }, { status: 404 });
  const clientId = process.env.NEXT_PUBLIC_TUFF_NEXUS_CLIENT_ID!;
  const authorizeUrl = process.env.TUFF_NEXUS_AUTHORIZE_URL!;

  const origin = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || new URL(request.url).origin;
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('omg_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  cookieStore.set('omg_terms_version', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });

  const redirectUri = `${origin}/api/auth/tuff-nexus/callback`;
  const url = new URL(authorizeUrl);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', process.env.TUFF_NEXUS_SCOPE || 'openid profile email');
  url.searchParams.set('state', state);
  return Response.redirect(url.toString());
}
