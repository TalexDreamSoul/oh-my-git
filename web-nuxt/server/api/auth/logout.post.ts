export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'omg_session');
  if (token) {
    await db().prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  deleteCookie(event, 'omg_session', { path: '/' });
  return { ok: true };
});
