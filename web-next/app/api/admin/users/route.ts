import { requireAdmin } from '../../../lib/admin';
import { getJson, kv } from '../../../lib/kv';

type StoredUser = {
  id: string;
  provider: string;
  provider_user_id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  terms_version?: number | null;
  terms_accepted_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ProgressRow = {
  level_id: string;
  solved?: number | boolean;
  best_score?: number | null;
  pure_cli?: number | boolean;
  updated_at?: string;
};

async function listKeys(prefix: string, limit = 500) {
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

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)));
  const keys = await listKeys('user:', limit);
  const users = (await Promise.all(keys.map((key) => getJson<StoredUser>(key)))).filter(Boolean) as StoredUser[];
  const rows = await Promise.all(users.map(async (user) => {
    const progress = (await getJson<ProgressRow[]>(`progress:${user.id}`)) || [];
    const solved = progress.filter((item) => item.solved === 1 || item.solved === true);
    return {
      id: user.id,
      provider: user.provider,
      provider_user_id: user.provider_user_id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      terms_version: user.terms_version,
      terms_accepted_at: user.terms_accepted_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
      solved_count: solved.length,
      total_score: solved.reduce((sum, item) => sum + (item.best_score ?? 0), 0),
      pure_cli_count: solved.filter((item) => item.pure_cli === 1 || item.pure_cli === true).length
    };
  }));
  return Response.json({ users: rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) });
}
