import { getJson, kv, requireUser } from '../../../lib/kv';
import { activeSeason, seasons } from '../../../lib/seasons';
import { boundedIntParam } from '../../../lib/request';
import { isVerifiedProgress } from '../../../lib/progress';

export type SeasonLeaderboardEntry = {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  season_id: string;
  total_score: number;
  solved_count: number;
  pure_cli_count: number;
  updated_at: string;
};

function sortSeasonEntries(a: SeasonLeaderboardEntry, b: SeasonLeaderboardEntry) {
  if (b.total_score !== a.total_score) return b.total_score - a.total_score;
  if (b.solved_count !== a.solved_count) return b.solved_count - a.solved_count;
  if (b.pure_cli_count !== a.pure_cli_count) return b.pure_cli_count - a.pure_cli_count;
  return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
}

function validSeasonId(seasonId: string) {
  return seasons.some((season) => season.id === seasonId);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seasonId = url.searchParams.get('seasonId') || activeSeason().id;
  const limit = boundedIntParam(url.searchParams.get('limit'), 20, 1, 100);
  if (!validSeasonId(seasonId)) return Response.json({ error: 'Unknown season.' }, { status: 400 });

  const user = await requireUser().catch(() => null);
  const entries = (await getJson<SeasonLeaderboardEntry[]>(`season-leaderboard:${seasonId}`)) || [];
  const sorted = [...entries].sort(sortSeasonEntries);
  const meIndex = user ? sorted.findIndex((entry) => entry.user_id === user.id) : -1;

  return Response.json({
    seasonId,
    entries: sorted.slice(0, limit),
    me: meIndex >= 0 ? { rank: meIndex + 1, entry: sorted[meIndex] } : null
  });
}

export async function upsertSeasonScore(input: Omit<SeasonLeaderboardEntry, 'total_score' | 'solved_count' | 'pure_cli_count' | 'updated_at'> & { progress: Array<{ level_id: string; solved?: number | boolean; best_score?: number | null; pure_cli?: number | boolean; verified?: number | boolean; imported?: number | boolean }> }) {
  const namespace = await kv();
  const key = `season-leaderboard:${input.season_id}`;
  const existing = (await getJson<SeasonLeaderboardEntry[]>(key)) || [];
  const withoutUser = existing.filter((item) => item.user_id !== input.user_id);
  const solved = input.progress.filter(isVerifiedProgress);

  if (solved.length === 0) {
    if (withoutUser.length === existing.length) return [...existing].sort(sortSeasonEntries).slice(0, 500);
    const next = withoutUser.sort(sortSeasonEntries).slice(0, 500);
    await namespace.put(key, JSON.stringify(next));
    return next;
  }

  const previous = existing.find((item) => item.user_id === input.user_id);
  const entry: SeasonLeaderboardEntry = {
    user_id: input.user_id,
    name: input.name,
    avatar_url: input.avatar_url,
    season_id: input.season_id,
    total_score: solved.reduce((sum, item) => sum + (item.best_score ?? 0), 0),
    solved_count: solved.length,
    pure_cli_count: solved.filter((item) => item.pure_cli === 1 || item.pure_cli === true).length,
    updated_at: previous?.updated_at ?? new Date().toISOString()
  };

  const sameScore = previous && previous.total_score === entry.total_score && previous.solved_count === entry.solved_count && previous.pure_cli_count === entry.pure_cli_count && previous.name === entry.name && previous.avatar_url === entry.avatar_url;
  if (sameScore) return [...existing].sort(sortSeasonEntries).slice(0, 500);

  const next = [...withoutUser, { ...entry, updated_at: new Date().toISOString() }].sort(sortSeasonEntries).slice(0, 500);
  await namespace.put(key, JSON.stringify(next));
  return next;
}
