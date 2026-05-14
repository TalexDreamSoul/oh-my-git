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

  const user = await upsertOAuthUser(event, {
    provider: 'google',
    provider_user_id: googleUser.sub,
    name: googleUser.name || googleUser.email || 'Google User',
    email: googleUser.email || null,
    avatar_url: googleUser.picture || null
  });

  await createSession(event, user.id);
  deleteCookie(event, 'omg_oauth_state', { path: '/' });
  return sendRedirect(event, '/');
});
