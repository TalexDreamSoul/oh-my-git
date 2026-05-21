import { requireAdmin } from '../../../lib/admin';
import { getJson, kv } from '../../../lib/kv';
import { VALID_LEVEL_IDS } from '../../../game/levelIds';
import { activeSeason } from '../../../lib/seasons';

type StoredUser = {
  id: string;
  provider: string;
  name: string;
  email?: string | null;
  created_at: string;
  updated_at: string;
};

type ProgressRow = {
  level_id: string;
  solved?: number | boolean;
  updated_at?: string;
};

type SeasonEntry = {
  user_id: string;
  name: string;
  total_score: number;
  solved_count: number;
  pure_cli_count: number;
  updated_at: string;
};

async function listKeys(prefix: string, limit = 1000) {
  const namespace = await kv();
  const keys: string[] = [];
  let cursor: string | undefined;
  if (!namespace.list) return [];
  do {
    const page = await namespace.list({ prefix, limit: Math.min(1000, limit - keys.length), cursor });
    keys.push(...page.keys.map((key) => key.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && keys.length < limit);
  return keys;
}

function dayKey(value?: string) {
  if (!value) return 'unknown';
  return value.slice(0, 10);
}

export async function GET() {
  await requireAdmin();
  const season = activeSeason();
  const [userKeys, progressKeys, sessionKeys] = await Promise.all([
    listKeys('user:', 500),
    listKeys('progress:', 500),
    listKeys('session:', 500)
  ]);

  const users = (await Promise.all(userKeys.map((key) => getJson<StoredUser>(key)))).filter(Boolean) as StoredUser[];
  const progresses = (await Promise.all(progressKeys.map(async (key) => ({ key, rows: (await getJson<ProgressRow[]>(key)) || [] }))));
  const seasonLeaderboard = (await getJson<SeasonEntry[]>(`season-leaderboard:${season.id}`)) || [];

  const providerCounts = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.provider] = (acc[user.provider] || 0) + 1;
    return acc;
  }, {});

  const signupsByDay = users.reduce<Record<string, number>>((acc, user) => {
    const key = dayKey(user.created_at);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const completionsByLevel = Object.fromEntries(VALID_LEVEL_IDS.map((levelId) => [levelId, 0])) as Record<string, number>;
  let solvedEvents = 0;
  for (const progress of progresses) {
    for (const row of progress.rows) {
      if (row.solved === 1 || row.solved === true) {
        solvedEvents += 1;
        completionsByLevel[row.level_id] = (completionsByLevel[row.level_id] || 0) + 1;
      }
    }
  }

  return Response.json({
    totals: {
      users: users.length,
      sessions: sessionKeys.length,
      progressRows: progresses.length,
      solvedEvents,
      seasonPlayers: seasonLeaderboard.length
    },
    providerCounts,
    signupsByDay: Object.entries(signupsByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    topLevels: Object.entries(completionsByLevel).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([levelId, count]) => ({ levelId, count })),
    seasonTop: seasonLeaderboard.sort((a, b) => b.total_score - a.total_score).slice(0, 20),
    recentUsers: users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20)
  });
}
