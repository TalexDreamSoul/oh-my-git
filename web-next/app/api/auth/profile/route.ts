import { z } from 'zod';
import { getJson, putJson, requireUser, StoredUser } from '../../../lib/kv';
import { activeSeason } from '../../../lib/seasons';
import { LeaderboardEntry } from '../../leaderboard/route';
import { SeasonLeaderboardEntry } from '../../season/leaderboard/route';

const Body = z.object({
  name: z.string().trim().min(1).max(32).optional(),
  leaderboardAnonymous: z.boolean().optional()
});

function publicLeaderboardName(user: StoredUser) {
  return user.leaderboard_anonymous ? '匿名玩家' : user.name;
}

function publicLeaderboardAvatar(user: StoredUser) {
  return user.leaderboard_anonymous ? null : user.avatar_url;
}

async function rewriteCurrentSeasonLeaderboards(user: StoredUser) {
  const season = activeSeason();
  const displayName = publicLeaderboardName(user);
  const avatarUrl = publicLeaderboardAvatar(user);

  const seasonKey = `season-leaderboard:${season.id}`;
  const seasonEntries = (await getJson<SeasonLeaderboardEntry[]>(seasonKey)) || [];
  if (seasonEntries.some((entry) => entry.user_id === user.id)) {
    await putJson(seasonKey, seasonEntries.map((entry) => entry.user_id === user.id ? { ...entry, name: displayName, avatar_url: avatarUrl } : entry));
  }

  const progress = (await getJson<Array<{ level_id: string }>>(`progress:${user.id}`)) || [];
  for (const item of progress) {
    if (!item.level_id) continue;
    const key = `leaderboard:${season.id}:${item.level_id}`;
    const entries = (await getJson<LeaderboardEntry[]>(key)) || [];
    if (!entries.some((entry) => entry.user_id === user.id)) continue;
    await putJson(key, entries.map((entry) => entry.user_id === user.id ? { ...entry, name: displayName, avatar_url: avatarUrl } : entry));
  }
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const body = Body.parse(await request.json());
  const next: StoredUser = {
    ...user,
    name: body.name ?? user.name,
    leaderboard_anonymous: body.leaderboardAnonymous ?? user.leaderboard_anonymous ?? false,
    updated_at: new Date().toISOString()
  };
  await putJson(`user:${user.id}`, next);
  await rewriteCurrentSeasonLeaderboards(next);
  return Response.json({ user: next });
}
