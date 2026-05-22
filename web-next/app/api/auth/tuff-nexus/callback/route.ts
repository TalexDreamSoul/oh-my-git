import { createSession, upsertOAuthUser } from '../../../../lib/kv';
import { cookies } from 'next/headers';
import { oauthProviderById } from '../../../../lib/oauthConfig';

type TuffNexusUser = {
  id?: string | number;
  userId?: string | number;
  sub?: string;
  username?: string;
  login?: string;
  name?: string;
  email?: string;
  image?: string;
  avatar_url?: string;
  avatar?: string;
  picture?: string;
};

type TuffNexusTokenResponse = {
  access_token?: string;
  appToken?: string;
  token_type?: string;
  error?: string;
  userId?: string;
  client_id?: string;
};

export async function GET(request: Request) {
  const config = await oauthProviderById('tuff-nexus');
  if (!config?.enabled) return Response.json({ error: 'Tuff Nexus OAuth is not configured' }, { status: 404 });

  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const cookieStore = await cookies();
  const cookieState = cookieStore.get('omg_oauth_state')?.value;
  if (!code || !state || state !== cookieState) return Response.json({ error: 'Invalid OAuth state' }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || url.origin;
  const redirectUri = `${origin}/api/auth/tuff-nexus/callback`;
  const tokenResponse = await fetch(config.token_url || '', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.client_id,
      client_secret: config.client_secret,
      code,
      redirect_uri: redirectUri
    })
  }).then((res) => res.json() as Promise<TuffNexusTokenResponse>);

  const accessToken = tokenResponse.access_token || tokenResponse.appToken || '';
  if (!accessToken && !tokenResponse.userId) return Response.json({ error: tokenResponse.error || 'Tuff Nexus token exchange failed' }, { status: 400 });

  let nexusUser: TuffNexusUser = {};
  if (accessToken) {
    const userinfoUrl = config.userinfo_url || 'https://tuff.tagzxia.com/api/v1/auth/me';
    nexusUser = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    }).then((res) => res.json() as Promise<TuffNexusUser>);
  }

  const providerId = String(nexusUser.id || nexusUser.userId || nexusUser.sub || tokenResponse.userId || nexusUser.username || nexusUser.login || nexusUser.email || crypto.randomUUID());
  const displayName = nexusUser.name || nexusUser.username || nexusUser.login || nexusUser.email || `Tuff Nexus ${providerId.slice(0, 8)}`;
  const termsVersion = Number(cookieStore.get('omg_terms_version')?.value || '1');
  const user = await upsertOAuthUser({
    provider: 'tuff-nexus',
    provider_user_id: providerId,
    name: displayName,
    email: nexusUser.email || null,
    avatar_url: nexusUser.avatar_url || nexusUser.avatar || nexusUser.picture || nexusUser.image || null,
    terms_version: termsVersion,
    terms_accepted_at: new Date().toISOString()
  });

  await createSession(user.id);
  cookieStore.delete('omg_oauth_state');
  cookieStore.delete('omg_terms_version');
  return Response.redirect(`${origin}/play`);
}
