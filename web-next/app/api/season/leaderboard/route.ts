import { getJson, kv, requireUser } from '../../../lib/kv';
import { activeSeason } from '../../../lib/seasons';

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seasonId = url.searchParams.get('seasonId') || activeSeason().id;
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
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

export async function upsertSeasonScore(input: Omit<SeasonLeaderboardEntry, 'total_score' | 'solved_count' | 'pure_cli_count' | 'updated_at'> & { progress: Array<{ level_id: string; solved?: number | boolean; best_score?: number | null; pure_cli?: number | boolean }> }) {
  const solved = input.progress.filter((item) => item.solved === 1 || item.solved === true);
  const entry: SeasonLeaderboardEntry = {
    user_id: input.user_id,
    name: input.name,
    avatar_url: input.avatar_url,
    season_id: input.season_id,
    total_score: solved.reduce((sum, item) => sum + (item.best_score ?? 0), 0),
    solved_count: solved.length,
    pure_cli_count: solved.filter((item) => item.pure_cli === 1 || item.pure_cli === true).length,
    updated_at: new Date().toISOString()
  };
  const namespace = await kv();
  const key = `season-leaderboard:${input.season_id}`;
  const existing = (await getJson<SeasonLeaderboardEntry[]>(key)) || [];
  const next = [...existing.filter((item) => item.user_id !== input.user_id), entry].sort(sortSeasonEntries).slice(0, 500);
  await namespace.put(key, JSON.stringify(next));
}
