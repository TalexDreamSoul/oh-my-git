type GoogleTokenResponse = {
  access_token: string;
  id_token: string;
};

type GoogleUser = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = String(query.code || '');
  const state = String(query.state || '');
  const cookieState = getCookie(event, 'omg_oauth_state');
  if (!code || !state || state !== cookieState) throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' });

  const config = useRuntimeConfig(event);
  const redirectUri = `${config.public.oauthRedirectBase}/api/auth/google/callback`;
  const tokenResponse = await $fetch<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: {
      client_id: config.public.googleClientId,
      client_secret: config.oauth.googleClientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }
  });

  const googleUser = await $fetch<GoogleUser>('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
  });

  const userId = newId('usr');
  const existing = await db().prepare('SELECT * FROM users WHERE provider = ? AND provider_user_id = ?').bind('google', googleUser.sub).first();
  const finalUserId = existing?.id || userId;
  if (!existing) {
    await db()
      .prepare('INSERT INTO users (id, provider, provider_user_id, name, email, avatar_url) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(finalUserId, 'google', googleUser.sub, googleUser.name || googleUser.email || 'Google User', googleUser.email || null, googleUser.picture || null)
      .run();
  } else {
    await db()
      .prepare('UPDATE users SET name = ?, email = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(googleUser.name || googleUser.email || 'Google User', googleUser.email || null, googleUser.picture || null, finalUserId)
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
