export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type ProgressLike = {
  level_id: string;
  solved?: number | boolean;
  best_time_seconds?: number | null;
  pure_cli?: number | boolean;
};

export const achievements: Achievement[] = [
  {
    id: 'first_level',
    title: 'Git 冒险启程',
    description: '完成任意一个关卡。',
    icon: '🚀'
  },
  {
    id: 'first_commit',
    title: '第一次存档',
    description: '完成第一次 commit 相关关卡。',
    icon: '💾'
  },
  {
    id: 'pure_cli_first',
    title: '命令行原教旨',
    description: '纯 CLI 完成任意一个关卡。',
    icon: '⌨️'
  },
  {
    id: 'speed_runner',
    title: '闪电操作',
    description: '60 秒内完成任意一个关卡。',
    icon: '⚡'
  },
  {
    id: 'chapter_one_clear',
    title: '基础冒险毕业',
    description: '完成第一章全部关卡。',
    icon: '🏁'
  }
];

export function achievementById(id: string) {
  return achievements.find((item) => item.id === id);
}

export function evaluateAchievements(progress: ProgressLike[]): string[] {
  const solved = progress.filter((item) => item.solved === true || item.solved === 1);
  const solvedIds = new Set(solved.map((item) => item.level_id));
  const unlocked = new Set<string>();

  if (solved.length > 0) unlocked.add('first_level');
  if (solvedIds.has('chapter-1-04-first-commit')) unlocked.add('first_commit');
  if (solved.some((item) => item.pure_cli === true || item.pure_cli === 1)) unlocked.add('pure_cli_first');
  if (solved.some((item) => typeof item.best_time_seconds === 'number' && item.best_time_seconds <= 60)) unlocked.add('speed_runner');

  const chapterOneIds = [
    'chapter-1-01-create-readme',
    'chapter-1-02-write-readme',
    'chapter-1-03-stage-readme',
    'chapter-1-04-first-commit',
    'chapter-1-05-change-readme',
    'chapter-1-06-second-commit',
    'chapter-1-07-create-branch',
    'chapter-1-08-checkout-branch',
    'chapter-1-09-feature-work',
    'chapter-1-10-clean-temp'
  ];
  if (chapterOneIds.every((id) => solvedIds.has(id))) unlocked.add('chapter_one_clear');

  return [...unlocked];
}
