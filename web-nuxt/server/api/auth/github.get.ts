export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const clientId = config.public.githubClientId;
  if (!clientId) throw createError({ statusCode: 500, statusMessage: 'Missing GitHub client id' });
  const state = crypto.randomUUID();
  setCookie(event, 'omg_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  const redirectUri = `${config.public.oauthRedirectBase}/api/auth/github/callback`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  return sendRedirect(event, url.toString());
});
