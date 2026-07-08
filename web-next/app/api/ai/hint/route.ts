import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildLocalAiHint } from '../../../game/aiCoach';
import { levels } from '../../../game/levels';
import { requireUser } from '../../../lib/kv';
import { jsonRequestErrorResponse, parseJsonBody } from '../../../lib/request';

const Body = z.object({
  levelId: z.string().min(1).max(128),
  message: z.string().max(600).optional(),
  completedConditions: z.array(z.string().min(1).max(80)).max(24).default([])
}).strict();

const levelById = new Map(levels.map((level) => [level.id, level]));

function unavailableResponse(reason = 'AI 教练暂未配置。') {
  return Response.json({
    ok: false,
    status: 'unavailable',
    reason,
    hint: '先使用右侧分层提示：思路 → 命令方向 → 完整参考。AI 教练上线后会基于当前关卡给出更细的下一步建议。'
  }, { status: 503 });
}

function fallbackHint(levelId: string, completedConditions: string[]) {
  const level = levelById.get(levelId);
  return level ? buildLocalAiHint(level, completedConditions) : null;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const body = await parseJsonBody(request, Body, 4 * 1024);

    const level = levelById.get(body.levelId);
    if (!level) return Response.json({ ok: false, error: 'Unknown level.' }, { status: 404 });

    const providerUrl = process.env.AI_HINT_ENDPOINT;
    const providerToken = process.env.AI_HINT_TOKEN;
    if (!providerUrl || !providerToken) {
      const fallback = fallbackHint(level.id, body.completedConditions);
      return fallback ? Response.json(fallback) : unavailableResponse();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const providerResponse = await fetch(providerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
        body: JSON.stringify({
          level: {
            id: level.id,
            title: level.title,
            summary: level.summary,
            tutorial: level.tutorial,
            win: level.win.map((condition) => condition.type)
          },
          player: {
            message: body.message ?? '',
            completedConditions: body.completedConditions
          },
          instruction: 'Return one concise Chinese hint. Do not reveal the complete command sequence unless the player explicitly asks.'
        }),
        signal: controller.signal
      });
      if (!providerResponse.ok) throw new Error('AI provider failed');
      const data = await providerResponse.json().catch(() => ({}));
      const hint = typeof data.hint === 'string' ? data.hint.trim() : '';
      if (!hint) throw new Error('AI provider returned empty hint');
      return Response.json({ ok: true, status: 'ai', hint: hint.slice(0, 800), source: 'provider' });
    } catch {
      const fallback = fallbackHint(level.id, body.completedConditions);
      return Response.json(fallback ?? { ok: false, status: 'error', reason: 'AI 教练请求失败，请稍后再试。' }, { status: 200 });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return jsonRequestErrorResponse(error);
  }
}
