export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'omg_session');
  if (token) await kv(event).delete(`session:${token}`);
  deleteCookie(event, 'omg_session', { path: '/' });
  return { ok: true };
});
