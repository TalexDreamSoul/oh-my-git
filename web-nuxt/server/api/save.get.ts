export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const row = await db().prepare('SELECT payload, updated_at FROM saves WHERE user_id = ?').bind(user.id).first();
  return { save: row ? JSON.parse(String(row.payload)) : null, updatedAt: row?.updated_at || null };
});
