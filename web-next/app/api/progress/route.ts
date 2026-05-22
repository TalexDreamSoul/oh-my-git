import { z } from 'zod';
import { checkAndUnlockAchievements } from '../achievements/route';
import { upsertLeaderboardEntry } from '../leaderboard/route';
import { upsertSeasonScore } from '../season/leaderboard/route';
import { getJson, publicUser, putJson, requireUser } from '../../lib/kv';
import { activeSeason } from '../../lib/seasons';
import { VALID_LEVEL_ID_SET } from '../../game/levelIds';

const Body = z.object({
  levelId: z.string().min(1),
  solved: z.boolean().default(true),
  score: z.number().int().min(0).max(100).optional(),
  timeSeconds: z.number().int().min(0).optional(),
  pureCli: z.boolean().default(false)
});

export async function GET() {
  const user = await requireUser();
  const progress = ((await getJson<any[]>(`progress:${user.id}`)) || []).filter((item) => VALID_LEVEL_ID_SET.has(item.level_id));
  return Response.json({ progress });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = Body.parse(await request.json());
  if (!VALID_LEVEL_ID_SET.has(body.levelId)) return Response.json({ error: 'Unknown level.' }, { status: 400 });
  const key = `progress:${user.id}`;
  const progress = (await getJson<any[]>(key)) || [];
  const existing = progress.find((item) => item.level_id === body.levelId);
  const now = new Date().toISOString();
  const season = activeSeason();
  const bestScore = existing?.best_score == null ? body.score ?? null : Math.max(existing.best_score, body.score ?? 0);
  const bestTimeSeconds =
    existing?.best_time_seconds == null
      ? body.timeSeconds ?? null
      : body.timeSeconds == null
        ? existing.best_time_seconds
        : Math.min(existing.best_time_seconds, body.timeSeconds);
  const next = {
    level_id: body.levelId,
    solved: body.solved ? 1 : 0,
    best_score: bestScore,
    best_time_seconds: bestTimeSeconds,
    pure_cli: Math.max(existing?.pure_cli ?? 0, body.pureCli ? 1 : 0),
    attempts: (existing?.attempts ?? 0) + 1,
    first_completed_at: existing?.first_completed_at || (body.solved ? now : null),
    season_id: season.id,
    updated_at: now
  };
  const updated = existing ? progress.map((item) => (item.level_id === body.levelId ? next : item)) : [...progress, next];
  await putJson(key, updated);

  const safeUser = publicUser(user);

  if (body.solved && bestScore != null) {
    await upsertLeaderboardEntry({
      user_id: user.id,
      name: safeUser.leaderboard_anonymous ? '匿名玩家' : safeUser.name,
      avatar_url: safeUser.leaderboard_anonymous ? null : safeUser.avatar_url,
      level_id: body.levelId,
      season_id: season.id,
      score: bestScore,
      time_seconds: bestTimeSeconds,
      pure_cli: Boolean(next.pure_cli),
      completed_at: next.first_completed_at || now
    });
  }

  await upsertSeasonScore({ user_id: user.id, name: safeUser.leaderboard_anonymous ? '匿名玩家' : safeUser.name, avatar_url: safeUser.leaderboard_anonymous ? null : safeUser.avatar_url, season_id: season.id, progress: updated });
  const unlockedAchievements = await checkAndUnlockAchievements(user.id);
  return Response.json({ ok: true, progress: next, unlockedAchievements });
}
