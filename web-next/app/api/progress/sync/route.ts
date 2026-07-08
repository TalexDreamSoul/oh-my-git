import { z } from 'zod';
import { getJson, putJson, requireUser } from '../../../lib/kv';
import { isVerifiedProgress, normalizeProgressRows, type ProgressRow } from '../../../lib/progress';
import { VALID_LEVEL_IDS, VALID_LEVEL_ID_SET } from '../../../game/levelIds';
import { jsonRequestErrorResponse, parseJsonBody } from '../../../lib/request';

const Body = z.object({
  solvedLevelIds: z.array(z.string().min(1).max(128)).max(VALID_LEVEL_IDS.length).default([])
}).strict();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody(request, Body, 16 * 1024);
    const key = `progress:${user.id}`;
    const progress = normalizeProgressRows(await getJson<unknown>(key));
    const now = new Date().toISOString();
    const existingByLevel = new Map(progress.map((item) => [item.level_id, item]));

    for (const levelId of body.solvedLevelIds.filter((id) => VALID_LEVEL_ID_SET.has(id))) {
      const existing = existingByLevel.get(levelId);
      if (isVerifiedProgress(existing)) continue;
      const next: ProgressRow = {
        level_id: levelId,
        solved: 1,
        best_score: existing?.best_score ?? null,
        best_time_seconds: existing?.best_time_seconds ?? null,
        pure_cli: existing?.pure_cli === 1 || existing?.pure_cli === true ? 1 : 0,
        attempts: existing?.attempts ?? 0,
        first_completed_at: existing?.first_completed_at || now,
        season_id: existing?.season_id ?? null,
        updated_at: now,
        verified: 0,
        imported: 1
      };
      existingByLevel.set(levelId, next);
    }

    const updated = [...existingByLevel.values()];
    await putJson(key, updated);
    return Response.json({ ok: true, progress: updated, unlockedAchievements: [] });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
