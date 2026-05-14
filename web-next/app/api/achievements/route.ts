import { achievementById, achievements, evaluateAchievements } from '../../lib/achievements';
import { getJson, putJson, requireUser } from '../../lib/kv';

export type UserAchievement = {
  id: string;
  unlocked_at: string;
};

export async function GET() {
  const user = await requireUser();
  const unlocked = (await getJson<UserAchievement[]>(`achievements:${user.id}`)) || [];
  return Response.json({
    achievements,
    unlocked: unlocked.map((item) => ({ ...item, achievement: achievementById(item.id) }))
  });
}

export async function checkAndUnlockAchievements(userId: string) {
  const progress = (await getJson<any[]>(`progress:${userId}`)) || [];
  const existing = (await getJson<UserAchievement[]>(`achievements:${userId}`)) || [];
  const existingIds = new Set(existing.map((item) => item.id));
  const now = new Date().toISOString();
  const candidateIds = evaluateAchievements(progress);
  const newlyUnlocked = candidateIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ id, unlocked_at: now }));

  if (newlyUnlocked.length > 0) {
    await putJson(`achievements:${userId}`, [...existing, ...newlyUnlocked]);
  }

  return newlyUnlocked.map((item) => ({ ...item, achievement: achievementById(item.id) }));
}
