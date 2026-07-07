import { VALID_LEVEL_IDS, VALID_LEVEL_ID_SET } from '../game/levelIds';

export type AchievementCategory = 'milestone' | 'skill' | 'chapter';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  target: number;
};

export type UserAchievementRecord = {
  id: string;
  unlocked_at: string;
};

export type AchievementProgress = {
  current: number;
  target: number;
  unlocked: boolean;
};

export type ProgressLike = {
  level_id: string;
  solved?: number | boolean;
  best_time_seconds?: number | null;
  pure_cli?: number | boolean;
};

type ProgressSummary = {
  solvedIds: Set<string>;
  solvedCount: number;
  pureCliCount: number;
  speedRunCount: number;
};

type AchievementRule = Achievement & {
  current: (summary: ProgressSummary) => number;
};

const chapterAchievementDefinitions = [
  {
    chapter: 1,
    id: 'chapter_one_clear',
    title: '基础冒险毕业',
    description: '完成第一章全部关卡。',
    icon: '🏁'
  },
  {
    chapter: 5,
    id: 'conflict_medic',
    title: '冲突急救员',
    description: '完成第五章冲突急救室。',
    icon: '🩹'
  },
  {
    chapter: 6,
    id: 'release_keeper',
    title: '发布守门人',
    description: '完成第六章临时口袋与版本标签。',
    icon: '🏷️'
  },
  {
    chapter: 7,
    id: 'history_surgeon',
    title: '历史外科医生',
    description: '完成第七章历史外科手术。',
    icon: '🧑‍⚕️'
  },
  {
    chapter: 8,
    id: 'project_janitor',
    title: '项目清洁工',
    description: '完成第八章项目卫生间。',
    icon: '🧹'
  },
  {
    chapter: 9,
    id: 'debug_detective',
    title: '调试侦探',
    description: '完成第九章侦探调试。',
    icon: '🕵️'
  },
  {
    chapter: 10,
    id: 'release_conductor',
    title: '发布列车长',
    description: '完成第十章发布列车。',
    icon: '🚆'
  },
  {
    chapter: 11,
    id: 'linear_history_keeper',
    title: '线性历史整理师',
    description: '完成第十一章线性历史整理。',
    icon: '📏'
  },
  {
    chapter: 12,
    id: 'time_detector',
    title: '时间侦测器',
    description: '完成第十二章时间侦测器。',
    icon: '🧭'
  },
  {
    chapter: 13,
    id: 'object_cartographer',
    title: '对象制图师',
    description: '完成第十三章对象仓库。',
    icon: '🗺️'
  },
  {
    chapter: 14,
    id: 'collaboration_scout',
    title: '协作侦察员',
    description: '完成第十四章多人协作进阶。',
    icon: '🤝'
  },
  {
    chapter: 15,
    id: 'mainline_challenger',
    title: '主线综合挑战者',
    description: '完成第十五章主线综合挑战。',
    icon: '🏆'
  },
  {
    chapter: 16,
    id: 'advanced_toolsmith',
    title: '高级工具匠',
    description: '完成第十六章高级工具箱。',
    icon: '🧰'
  }
] as const;

function chapterLevelIds(chapter: number): string[] {
  return VALID_LEVEL_IDS.filter((id) => id.startsWith(`chapter-${chapter}-`));
}

function summarizeProgress(progress: ProgressLike[]): ProgressSummary {
  const solvedByLevel = new Map<string, { pureCli: boolean; bestTimeSeconds: number | null }>();

  for (const item of progress) {
    if ((item.solved !== true && item.solved !== 1) || !VALID_LEVEL_ID_SET.has(item.level_id)) continue;
    const existing = solvedByLevel.get(item.level_id);
    const bestTimeSeconds = typeof item.best_time_seconds === 'number' ? item.best_time_seconds : null;
    const previousBestTimeSeconds = existing?.bestTimeSeconds ?? null;
    solvedByLevel.set(item.level_id, {
      pureCli: Boolean(existing?.pureCli) || item.pure_cli === true || item.pure_cli === 1,
      bestTimeSeconds: previousBestTimeSeconds == null ? bestTimeSeconds : bestTimeSeconds == null ? previousBestTimeSeconds : Math.min(previousBestTimeSeconds, bestTimeSeconds)
    });
  }

  const solved = [...solvedByLevel.values()];
  return {
    solvedIds: new Set(solvedByLevel.keys()),
    solvedCount: solvedByLevel.size,
    pureCliCount: solved.filter((item) => item.pureCli).length,
    speedRunCount: solved.filter((item) => typeof item.bestTimeSeconds === 'number' && item.bestTimeSeconds <= 60).length
  };
}

const achievementRules: AchievementRule[] = [
  {
    id: 'first_level',
    title: 'Git 冒险启程',
    description: '完成任意一个关卡。',
    icon: '🚀',
    category: 'milestone',
    target: 1,
    current: (summary) => summary.solvedCount
  },
  {
    id: 'first_commit',
    title: '第一次存档',
    description: '完成第一次 commit 相关关卡。',
    icon: '💾',
    category: 'milestone',
    target: 1,
    current: (summary) => (summary.solvedIds.has('chapter-1-04-first-commit') ? 1 : 0)
  },
  {
    id: 'pure_cli_first',
    title: '命令行原教旨',
    description: '纯 CLI 完成任意一个关卡。',
    icon: '⌨️',
    category: 'skill',
    target: 1,
    current: (summary) => summary.pureCliCount
  },
  {
    id: 'speed_runner',
    title: '闪电操作',
    description: '60 秒内完成任意一个关卡。',
    icon: '⚡',
    category: 'skill',
    target: 1,
    current: (summary) => summary.speedRunCount
  },
  ...chapterAchievementDefinitions.map((definition) => {
    const levelIds = chapterLevelIds(definition.chapter);
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      category: 'chapter' as const,
      target: levelIds.length,
      current: (summary: ProgressSummary) => levelIds.filter((id) => summary.solvedIds.has(id)).length
    };
  })
];

export const achievements: Achievement[] = achievementRules.map(({ current: _current, ...achievement }) => achievement);

const achievementMap = new Map(achievements.map((item) => [item.id, item]));
const achievementRuleMap = new Map(achievementRules.map((item) => [item.id, item]));

export function achievementById(id: string) {
  return achievementMap.get(id);
}

export function achievementProgressById(id: string, progress: ProgressLike[]): AchievementProgress | null {
  const rule = achievementRuleMap.get(id);
  if (!rule) return null;
  const current = rule.current(summarizeProgress(progress));
  return {
    current,
    target: rule.target,
    unlocked: current >= rule.target
  };
}

export function normalizeUserAchievements(records: Array<Partial<UserAchievementRecord> | null | undefined>, fallbackUnlockedAt = new Date().toISOString()): UserAchievementRecord[] {
  const seen = new Set<string>();
  const normalized: UserAchievementRecord[] = [];

  for (const item of records) {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      unlocked_at: typeof item?.unlocked_at === 'string' && item.unlocked_at ? item.unlocked_at : fallbackUnlockedAt
    });
  }

  return normalized;
}

export function evaluateAchievements(progress: ProgressLike[]): string[] {
  const summary = summarizeProgress(progress);
  return achievementRules.filter((rule) => rule.current(summary) >= rule.target).map((rule) => rule.id);
}
