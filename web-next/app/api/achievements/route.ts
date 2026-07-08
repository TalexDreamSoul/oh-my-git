import {
  achievementById,
  achievementProgressById,
  achievements,
  evaluateAchievements,
  normalizeUserAchievements,
  type ProgressLike,
  type UserAchievementRecord
} from '../../lib/achievements';
import { getJson, putJson, requireUser } from '../../lib/kv';
import { isVerifiedProgress, normalizeProgressRows } from '../../lib/progress';

export type UserAchievement = UserAchievementRecord;

type AchievementWithState = (typeof achievements)[number] & {
  unlocked_at: string | null;
  progress: ReturnType<typeof achievementProgressById>;
};

function sameRecords(left: UserAchievementRecord[], right: Array<Partial<UserAchievementRecord> | null | undefined>) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item.id === right[index]?.id && item.unlocked_at === right[index]?.unlocked_at);
}

function decorateUnlocked(records: UserAchievementRecord[]) {
  return records.map((item) => ({ ...item, achievement: achievementById(item.id) }));
}

function achievementStates(progress: ProgressLike[], unlocked: UserAchievementRecord[]): AchievementWithState[] {
  const unlockedById = new Map(unlocked.map((item) => [item.id, item.unlocked_at]));
  return achievements.map((achievement) => ({
    ...achievement,
    unlocked_at: unlockedById.get(achievement.id) ?? null,
    progress: achievementProgressById(achievement.id, progress)
  }));
}

async function loadAchievementState(userId: string, progressOverride?: ProgressLike[]) {
  const [progressValue, storedValue] = await Promise.all([
    progressOverride ? Promise.resolve(progressOverride) : getJson<unknown>(`progress:${userId}`),
    getJson<unknown>(`achievements:${userId}`)
  ]);
  const progress = (Array.isArray(progressValue) ? progressValue : normalizeProgressRows(progressValue)).filter(isVerifiedProgress);
  const stored = Array.isArray(storedValue) ? storedValue as UserAchievementRecord[] : [];
  const now = new Date().toISOString();
  const existing = normalizeUserAchievements(stored, now);
  const existingIds = new Set(existing.map((item) => item.id));
  const newlyUnlocked = evaluateAchievements(progress)
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ id, unlocked_at: now }));
  const unlocked = [...existing, ...newlyUnlocked];

  if (newlyUnlocked.length > 0 || !sameRecords(existing, stored) || storedValue !== null && !Array.isArray(storedValue)) {
    await putJson(`achievements:${userId}`, unlocked);
  }

  return { progress, unlocked, newlyUnlocked };
}

export async function GET() {
  const user = await requireUser();
  const { progress, unlocked } = await loadAchievementState(user.id);
  return Response.json({
    achievements: achievementStates(progress, unlocked),
    unlocked: decorateUnlocked(unlocked)
  });
}

export async function checkAndUnlockAchievements(userId: string, progress?: ProgressLike[]) {
  const { newlyUnlocked } = await loadAchievementState(userId, progress);
  return decorateUnlocked(newlyUnlocked);
}
