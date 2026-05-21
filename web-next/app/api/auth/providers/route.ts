import { enabledOAuthProviders } from '../../../lib/oauthConfig';

export async function GET() {
  return Response.json({ providers: enabledOAuthProviders().map(({ id, label, loginPath }) => ({ id, label, loginPath })) });
}
