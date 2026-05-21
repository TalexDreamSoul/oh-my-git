import { createSession, upsertOAuthUser } from '../../../../lib/kv';
import { cookies } from 'next/headers';

type GoogleUser = {
  sub: string;
  name?: string;
  email?: string;
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
  const redirectUri = `${origin}/api/auth/google/callback`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  }).then((res) => res.json() as Promise<{ access_token: string; error?: string }>);

  if (!tokenResponse.access_token) return Response.json({ error: tokenResponse.error || 'Google token exchange failed' }, { status: 400 });

  const googleUser = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
  }).then((res) => res.json() as Promise<GoogleUser>);

  const termsVersion = Number(cookieStore.get('omg_terms_version')?.value || '1');
  const user = await upsertOAuthUser({
    provider: 'google',
    provider_user_id: googleUser.sub,
    name: googleUser.name || googleUser.email || 'Google User',
    email: googleUser.email || null,
    avatar_url: googleUser.picture || null,
    terms_version: termsVersion,
    terms_accepted_at: new Date().toISOString()
  });

  await createSession(user.id);
  cookieStore.delete('omg_oauth_state');
  cookieStore.delete('omg_terms_version');
  return Response.redirect(`${origin}/play`);
}
