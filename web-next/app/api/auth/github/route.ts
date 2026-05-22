import { cookies } from 'next/headers';
import { oauthProviderById } from '../../../lib/oauthConfig';

export async function GET(request: Request) {
  const config = await oauthProviderById('github');
  if (!config?.enabled) return Response.json({ error: 'GitHub OAuth is not configured' }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || new URL(request.url).origin;
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('omg_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  cookieStore.set('omg_terms_version', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  const redirectUri = `${origin}/api/auth/github/callback`;
  const url = new URL(config.authorize_url || 'https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', config.client_id);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', config.scope || 'read:user user:email');
  url.searchParams.set('state', state);
  return Response.redirect(url.toString());
}
