import { createSession, upsertOAuthUser } from '../../../../lib/kv';
import { cookies } from 'next/headers';

type GitHubUser = {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const cookieStore = await cookies();
  const cookieState = cookieStore.get('omg_oauth_state')?.value;
  if (!code || !state || state !== cookieState) return Response.json({ error: 'Invalid OAuth state' }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || url.origin;
  const redirectUri = `${origin}/api/auth/github/callback`;
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      state
    })
  }).then((res) => res.json() as Promise<{ access_token: string; error?: string }>);

  if (!tokenResponse.access_token) return Response.json({ error: tokenResponse.error || 'GitHub token exchange failed' }, { status: 400 });

  const ghUser = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}`, 'User-Agent': 'oh-my-git-web' }
  }).then((res) => res.json() as Promise<GitHubUser>);

  const termsVersion = Number(cookieStore.get('omg_terms_version')?.value || '1');
  const user = await upsertOAuthUser({
    provider: 'github',
    provider_user_id: String(ghUser.id),
    name: ghUser.name || ghUser.login,
    email: ghUser.email || null,
    avatar_url: ghUser.avatar_url || null,
    terms_version: termsVersion,
    terms_accepted_at: new Date().toISOString()
  });

  await createSession(user.id);
  cookieStore.delete('omg_oauth_state');
  cookieStore.delete('omg_terms_version');
  return Response.redirect(`${origin}/play`);
}
