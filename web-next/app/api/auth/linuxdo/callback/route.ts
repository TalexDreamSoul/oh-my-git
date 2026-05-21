import { createSession, upsertOAuthUser } from '../../../../lib/kv';
import { cookies } from 'next/headers';

type LinuxDoUser = {
  id?: number | string;
  sub?: string;
  username?: string;
  login?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  avatar?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const cookieStore = await cookies();
  const cookieState = cookieStore.get('omg_oauth_state')?.value;
  if (!code || !state || state !== cookieState) return Response.json({ error: 'Invalid OAuth state' }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || url.origin;
  const redirectUri = `${origin}/api/auth/linuxdo/callback`;
  const tokenResponse = await fetch('https://connect.linux.do/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_LINUXDO_CLIENT_ID || '',
      client_secret: process.env.LINUXDO_CLIENT_SECRET || '',
      code,
      redirect_uri: redirectUri
    })
  }).then((res) => res.json() as Promise<{ access_token?: string; token_type?: string; error?: string }>);

  if (!tokenResponse.access_token) return Response.json({ error: tokenResponse.error || 'Linux.do token exchange failed' }, { status: 400 });

  const linuxdoUser = await fetch('https://connect.linux.do/api/user', {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}`, Accept: 'application/json' }
  }).then((res) => res.json() as Promise<LinuxDoUser>);

  const providerId = String(linuxdoUser.id || linuxdoUser.sub || linuxdoUser.username || linuxdoUser.login || linuxdoUser.email || crypto.randomUUID());
  const displayName = linuxdoUser.name || linuxdoUser.username || linuxdoUser.login || linuxdoUser.email || 'Linux.do User';
  const termsVersion = Number(cookieStore.get('omg_terms_version')?.value || '1');
  const user = await upsertOAuthUser({
    provider: 'linuxdo',
    provider_user_id: providerId,
    name: displayName,
    email: linuxdoUser.email || null,
    avatar_url: linuxdoUser.avatar_url || linuxdoUser.avatar || linuxdoUser.picture || null,
    terms_version: termsVersion,
    terms_accepted_at: new Date().toISOString()
  });

  await createSession(user.id);
  cookieStore.delete('omg_oauth_state');
  cookieStore.delete('omg_terms_version');
  return Response.redirect(`${origin}/play`);
}
