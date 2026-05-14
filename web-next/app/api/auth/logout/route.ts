import { kv } from '../../../lib/kv';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('omg_session')?.value;
  if (token) await (await kv()).delete(`session:${token}`);
  cookieStore.delete('omg_session');
  return Response.json({ ok: true });
}
