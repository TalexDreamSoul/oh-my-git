export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const clientId = config.public.googleClientId;
  if (!clientId) throw createError({ statusCode: 500, statusMessage: 'Missing Google client id' });
  const state = crypto.randomUUID();
  setCookie(event, 'omg_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  const redirectUri = `${config.public.oauthRedirectBase}/api/auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  return sendRedirect(event, url.toString());
});
