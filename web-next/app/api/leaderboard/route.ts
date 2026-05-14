import { getJson, kv, requireUser } from '../../lib/kv';
import { activeSeason } from '../../lib/seasons';

export type LeaderboardEntry = {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  level_id: string;
  season_id: string;
  score: number;
  time_seconds: number | null;
  pure_cli: boolean;
  completed_at: string;
};

function sortEntries(a: LeaderboardEntry, b: LeaderboardEntry) {
  if (b.score !== a.score) return b.score - a.score;
  const aTime = a.time_seconds ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.time_seconds ?? Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  if (a.pure_cli !== b.pure_cli) return a.pure_cli ? -1 : 1;
  return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const levelId = url.searchParams.get('levelId');
  const seasonId = url.searchParams.get('seasonId') || activeSeason().id;
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 10)));
  if (!levelId) return Response.json({ error: 'Missing levelId' }, { status: 400 });

  const user = await requireUser().catch(() => null);
  const entries = (await getJson<LeaderboardEntry[]>(`leaderboard:${seasonId}:${levelId}`)) || [];
  const sorted = [...entries].sort(sortEntries);
  const meIndex = user ? sorted.findIndex((entry) => entry.user_id === user.id) : -1;

  return Response.json({
    seasonId,
    levelId,
    entries: sorted.slice(0, limit),
    me: meIndex >= 0 ? { rank: meIndex + 1, entry: sorted[meIndex] } : null
  });
}

export async function upsertLeaderboardEntry(entry: LeaderboardEntry) {
  const namespace = await kv();
  const key = `leaderboard:${entry.season_id}:${entry.level_id}`;
  const existing = (await getJson<LeaderboardEntry[]>(key)) || [];
  const previous = existing.find((item) => item.user_id === entry.user_id);
  const shouldReplace = !previous || sortEntries(entry, previous) < 0;
  const next = shouldReplace
    ? [...existing.filter((item) => item.user_id !== entry.user_id), entry].sort(sortEntries).slice(0, 100)
    : existing.sort(sortEntries).slice(0, 100);
  await namespace.put(key, JSON.stringify(next));
}
