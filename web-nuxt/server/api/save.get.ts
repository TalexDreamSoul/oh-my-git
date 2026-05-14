export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const row = await getJson<{ payload: unknown; updated_at: string }>(event, `save:${user.id}`);
  return { save: row?.payload || null, updatedAt: row?.updated_at || null };
});
