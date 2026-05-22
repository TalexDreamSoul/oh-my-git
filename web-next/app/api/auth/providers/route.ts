import { enabledOAuthProviders } from '../../../lib/oauthConfig';

export async function GET() {
  const providers = await enabledOAuthProviders();
  return Response.json({ providers: providers.map(({ id, label, loginPath }) => ({ id, label, loginPath })) });
}
