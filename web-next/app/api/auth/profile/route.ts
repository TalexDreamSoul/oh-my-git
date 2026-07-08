import { z } from 'zod';
import { putJson, requireUser, StoredUser } from '../../../lib/kv';
import { jsonRequestErrorResponse, parseJsonBody } from '../../../lib/request';

const Body = z.object({
  name: z.string().trim().min(1).max(32).optional(),
  leaderboardAnonymous: z.boolean().optional()
}).strict();

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody(request, Body, 2 * 1024);
    const next: StoredUser = {
      ...user,
      name: body.name ?? user.name,
      leaderboard_anonymous: body.leaderboardAnonymous ?? user.leaderboard_anonymous ?? false,
      updated_at: new Date().toISOString()
    };
    await putJson(`user:${user.id}`, next);
    return Response.json({ user: next });
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
