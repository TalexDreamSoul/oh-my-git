import { z } from 'zod';
import { checkAndUnlockAchievements } from '../../achievements/route';
import { upsertSeasonScore } from '../../season/leaderboard/route';
import { getJson, putJson, requireUser } from '../../../lib/kv';
import { activeSeason } from '../../../lib/seasons';

const Body = z.object({
  solvedLevelIds: z.array(z.string().min(1)).default([])
});

export async function POST(request: Request) {
  const user = await requireUser();
  const body = Body.parse(await request.json());
  const key = `progress:${user.id}`;
  const progress = (await getJson<any[]>(key)) || [];
  const now = new Date().toISOString();
  const existingByLevel = new Map(progress.map((item) => [item.level_id, item]));

  for (const levelId of body.solvedLevelIds) {
    const existing = existingByLevel.get(levelId);
    if (existing) {
      existingByLevel.set(levelId, { ...existing, solved: 1, updated_at: now, first_completed_at: existing.first_completed_at || now });
    } else {
      existingByLevel.set(levelId, {
        level_id: levelId,
        solved: 1,
        best_score: null,
        best_time_seconds: null,
        pure_cli: 0,
        attempts: 0,
        first_completed_at: now,
        season_id: null,
        updated_at: now
      });
    }
  }

  const updated = [...existingByLevel.values()];
  await putJson(key, updated);
  const season = activeSeason();
  await upsertSeasonScore({ user_id: user.id, name: user.name, avatar_url: user.avatar_url, season_id: season.id, progress: updated });
  const unlockedAchievements = await checkAndUnlockAchievements(user.id);
  return Response.json({ ok: true, progress: updated, unlockedAchievements });
}
