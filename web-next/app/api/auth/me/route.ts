import { currentUser, publicUser } from '../../../lib/kv';

export async function GET() {
  const user = await currentUser();
  return Response.json({ user: user ? publicUser(user) : null });
}
