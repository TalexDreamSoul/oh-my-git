type GitHubUser = {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = String(query.code || '');
  const state = String(query.state || '');
  const cookieState = getCookie(event, 'omg_oauth_state');
  if (!code || !state || state !== cookieState) throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' });

  const config = useRuntimeConfig(event);
  const redirectUri = `${config.public.oauthRedirectBase}/api/auth/github/callback`;
  const tokenResponse = await $fetch<{ access_token: string }>('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: {
      client_id: config.public.githubClientId,
      client_secret: config.oauth.githubClientSecret,
      code,
      redirect_uri: redirectUri,
      state
    }
  });

  const ghUser = await $fetch<GitHubUser>('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}`, 'User-Agent': 'oh-my-git-web' }
  });

  const user = await upsertOAuthUser(event, {
    provider: 'github',
    provider_user_id: String(ghUser.id),
    name: ghUser.name || ghUser.login,
    email: ghUser.email || null,
    avatar_url: ghUser.avatar_url || null
  });

  await createSession(event, user.id);
  deleteCookie(event, 'omg_oauth_state', { path: '/' });
  return sendRedirect(event, '/');
});
