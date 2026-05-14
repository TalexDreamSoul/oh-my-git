export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const progress = (await getJson<any[]>(event, `progress:${user.id}`)) || [];
  return { progress };
});
