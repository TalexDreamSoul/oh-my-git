import { clearAdminSession } from '../../../lib/admin';

export async function POST() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
