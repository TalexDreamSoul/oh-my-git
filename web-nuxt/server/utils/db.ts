export function db() {
  return hubDatabase();
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}

export async function currentUser(event: any) {
  const token = getCookie(event, 'omg_session');
  if (!token) return null;
  const row = await db()
    .prepare('SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ? AND sessions.expires_at > CURRENT_TIMESTAMP')
    .bind(token)
    .first();
  return row || null;
}

export async function requireUser(event: any) {
  const user = await currentUser(event);
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  return user;
}
