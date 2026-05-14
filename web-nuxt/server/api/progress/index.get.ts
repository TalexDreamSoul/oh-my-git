export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const rows = await db().prepare('SELECT level_id, solved, best_score, best_time_seconds, pure_cli, updated_at FROM progress WHERE user_id = ?').bind(user.id).all();
  return { progress: rows.results || [] };
});
