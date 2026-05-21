import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  if (!clientId) return Response.json({ error: 'Missing NEXT_PUBLIC_GITHUB_CLIENT_ID' }, { status: 500 });
  const origin = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || new URL(request.url).origin;
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('omg_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  cookieStore.set('omg_terms_version', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  const redirectUri = `${origin}/api/auth/github/callback`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  return Response.redirect(url.toString());
}
