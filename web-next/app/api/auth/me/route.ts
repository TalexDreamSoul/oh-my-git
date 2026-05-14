import { currentUser } from '../../../lib/kv';

export async function GET() {
  const user = await currentUser();
  return Response.json({ user });
}
