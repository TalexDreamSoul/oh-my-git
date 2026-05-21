import { createSession, upsertOAuthUser } from '../../../../lib/kv';
import { cookies } from 'next/headers';

type TuffNexusUser = {
  id?: string | number;
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

  const tokenUrl = process.env.TUFF_NEXUS_TOKEN_URL;
  const userInfoUrl = process.env.TUFF_NEXUS_USERINFO_URL;
  if (!tokenUrl || !userInfoUrl) return Response.json({ error: 'Missing Tuff Nexus OAuth configuration' }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || url.origin;
  const redirectUri = `${origin}/api/auth/tuff-nexus/callback`;
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_TUFF_NEXUS_CLIENT_ID || '',
      client_secret: process.env.TUFF_NEXUS_CLIENT_SECRET || '',
      code,
      redirect_uri: redirectUri
    })
  }).then((res) => res.json() as Promise<{ access_token?: string; token_type?: string; error?: string }>);

  if (!tokenResponse.access_token) return Response.json({ error: tokenResponse.error || 'Tuff Nexus token exchange failed' }, { status: 400 });

  const nexusUser = await fetch(userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}`, Accept: 'application/json' }
  }).then((res) => res.json() as Promise<TuffNexusUser>);

  const providerId = String(nexusUser.id || nexusUser.sub || nexusUser.username || nexusUser.login || nexusUser.email || crypto.randomUUID());
  const displayName = nexusUser.name || nexusUser.username || nexusUser.login || nexusUser.email || 'Tuff Nexus User';
  const termsVersion = Number(cookieStore.get('omg_terms_version')?.value || '1');
  const user = await upsertOAuthUser({
    provider: 'tuff-nexus',
    provider_user_id: providerId,
    name: displayName,
    email: nexusUser.email || null,
    avatar_url: nexusUser.avatar_url || nexusUser.avatar || nexusUser.picture || null,
    terms_version: termsVersion,
    terms_accepted_at: new Date().toISOString()
  });

  await createSession(user.id);
  cookieStore.delete('omg_oauth_state');
  cookieStore.delete('omg_terms_version');
  return Response.redirect(`${origin}/play`);
}
