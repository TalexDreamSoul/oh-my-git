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

  const userId = newId('usr');
  const existing = await db().prepare('SELECT * FROM users WHERE provider = ? AND provider_user_id = ?').bind('github', String(ghUser.id)).first();
  const finalUserId = existing?.id || userId;
  if (!existing) {
    await db()
      .prepare('INSERT INTO users (id, provider, provider_user_id, name, email, avatar_url) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(finalUserId, 'github', String(ghUser.id), ghUser.name || ghUser.login, ghUser.email || null, ghUser.avatar_url || null)
      .run();
  } else {
    await db()
      .prepare('UPDATE users SET name = ?, email = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(ghUser.name || ghUser.login, ghUser.email || null, ghUser.avatar_url || null, finalUserId)
      .run();
  }

  const session = newId('ses');
  await db()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))")
    .bind(session, finalUserId)
    .run();
  setCookie(event, 'omg_session', session, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  deleteCookie(event, 'omg_oauth_state', { path: '/' });
  return sendRedirect(event, '/');
});
