import { z } from 'zod';
import { checkAndUnlockAchievements } from '../achievements/route';
import { upsertLeaderboardEntry } from '../leaderboard/route';
import { upsertSeasonScore } from '../season/leaderboard/route';
import { getJson, publicUser, putJson, requireUser } from '../../lib/kv';
import { MAX_PROGRESS_ATTEMPTS, isVerifiedProgress, normalizeProgressRows, type ProgressRow } from '../../lib/progress';
import { activeSeason } from '../../lib/seasons';
import { VALID_LEVEL_ID_SET } from '../../game/levelIds';
import { jsonRequestErrorResponse, parseJsonBody } from '../../lib/request';

const Body = z.object({
  levelId: z.string().min(1).max(128),
  solved: z.boolean().default(true),
  // Backward-compatible fields from older clients. They are accepted for rollout safety,
  // but never used as authoritative completion metrics.
  score: z.number().int().min(0).max(100).optional(),
  timeSeconds: z.number().int().min(0).optional(),
  pureCli: z.boolean().default(false)
}).strict();

export async function GET() {
  const user = await requireUser();
  const progress = normalizeProgressRows(await getJson<unknown>(`progress:${user.id}`));
  return Response.json({ progress });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody(request, Body, 4 * 1024);
    if (!VALID_LEVEL_ID_SET.has(body.levelId)) return Response.json({ error: 'Unknown level.' }, { status: 400 });
    if (!body.solved) return Response.json({ error: 'Progress can only be completed through this endpoint.' }, { status: 400 });

    const key = `progress:${user.id}`;
    const progress = normalizeProgressRows(await getJson<unknown>(key));
    const existing = progress.find((item) => item.level_id === body.levelId);
    const now = new Date().toISOString();
    const verified = isVerifiedProgress(existing) ? 1 : 0;
    const next: ProgressRow = {
      level_id: body.levelId,
      solved: 1,
      best_score: existing?.best_score ?? null,
      best_time_seconds: existing?.best_time_seconds ?? null,
      pure_cli: existing?.pure_cli === 1 || existing?.pure_cli === true ? 1 : 0,
      attempts: Math.min(MAX_PROGRESS_ATTEMPTS, (existing?.attempts ?? 0) + 1),
      first_completed_at: existing?.first_completed_at || now,
      season_id: existing?.season_id ?? null,
      updated_at: now,
      verified
    };
    if (existing?.imported === 1 || existing?.imported === true) next.imported = 1;

    const updated = existing ? progress.map((item) => (item.level_id === body.levelId ? next : item)) : [...progress, next];
    await putJson(key, updated);

    const safeUser = publicUser(user);
    let leaderboard = null;
    let seasonLeaderboard = null;
    if (!existing && isVerifiedProgress(next) && next.best_score != null) {
      const season = activeSeason();
      leaderboard = await upsertLeaderboardEntry({
        user_id: user.id,
        name: safeUser.leaderboard_anonymous ? '匿名玩家' : safeUser.name,
        avatar_url: safeUser.leaderboard_anonymous ? null : safeUser.avatar_url,
        level_id: body.levelId,
        season_id: season.id,
        score: next.best_score,
        time_seconds: next.best_time_seconds ?? null,
        pure_cli: next.pure_cli === 1 || next.pure_cli === true,
        completed_at: next.first_completed_at || now
      });
      seasonLeaderboard = await upsertSeasonScore({ user_id: user.id, name: safeUser.leaderboard_anonymous ? '匿名玩家' : safeUser.name, avatar_url: safeUser.leaderboard_anonymous ? null : safeUser.avatar_url, season_id: season.id, progress: updated });
    }

    const unlockedAchievements = await checkAndUnlockAchievements(user.id, updated);
    return Response.json({ ok: true, progress: next, unlockedAchievements, leaderboard, seasonLeaderboard });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
