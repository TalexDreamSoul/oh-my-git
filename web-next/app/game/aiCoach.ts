import { getLevelHintPack } from './levelHints';
import { Level } from './levels';

export type AiCoachPayload = {
  levelId: string;
  message?: string;
  completedConditions?: string[];
};

export type AiCoachHint = {
  ok: true;
  status: 'fallback';
  hint: string;
  source: 'local-hints';
};

export function buildLocalAiHint(level: Level, completedConditions: string[] = []): AiCoachHint {
  const hintPack = getLevelHintPack(level);
  const remainingCount = Math.max(0, level.win.length - completedConditions.length);
  return {
    ok: true,
    status: 'fallback',
    hint: `${hintPack.concept} 下一步建议：${hintPack.direction}${remainingCount > 0 ? ` 还剩 ${remainingCount} 个目标未完成。` : ' 当前目标看起来已经完成，可以检查任务列表或提交状态。'}`,
    source: 'local-hints'
  };
}
