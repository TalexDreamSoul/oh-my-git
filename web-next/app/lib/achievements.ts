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
  },
  {
    id: 'conflict_medic',
    title: '冲突急救员',
    description: '完成第五章冲突急救室。',
    icon: '🩹'
  },
  {
    id: 'release_keeper',
    title: '发布守门人',
    description: '完成第六章临时口袋与版本标签。',
    icon: '🏷️'
  },
  {
    id: 'history_surgeon',
    title: '历史外科医生',
    description: '完成第七章历史外科手术。',
    icon: '🧑‍⚕️'
  },
  {
    id: 'project_janitor',
    title: '项目清洁工',
    description: '完成第八章项目卫生间。',
    icon: '🧹'
  },
  {
    id: 'debug_detective',
    title: '调试侦探',
    description: '完成第九章侦探调试。',
    icon: '🕵️'
  },
  {
    id: 'release_conductor',
    title: '发布列车长',
    description: '完成第十章发布列车。',
    icon: '🚆'
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

  const chapterFiveIds = [
    'chapter-5-01-conflict-start',
    'chapter-5-02-read-conflict',
    'chapter-5-03-stage-resolution',
    'chapter-5-04-commit-resolution',
    'chapter-5-05-abort-merge',
    'chapter-5-06-conflict-clean-room'
  ];
  if (chapterFiveIds.every((id) => solvedIds.has(id))) unlocked.add('conflict_medic');

  const chapterSixIds = [
    'chapter-6-01-stash-work',
    'chapter-6-02-apply-stash',
    'chapter-6-03-pop-stash',
    'chapter-6-04-create-release-tag',
    'chapter-6-05-checkout-tag',
    'chapter-6-06-delete-wrong-tag'
  ];
  if (chapterSixIds.every((id) => solvedIds.has(id))) unlocked.add('release_keeper');

  const chapterSevenIds = [
    'chapter-7-01-cherry-pick-intro',
    'chapter-7-02-revert-by-restore',
    'chapter-7-03-amend-last-commit',
    'chapter-7-04-split-work-commit',
    'chapter-7-05-rename-carefully',
    'chapter-7-06-release-surgery'
  ];
  if (chapterSevenIds.every((id) => solvedIds.has(id))) unlocked.add('history_surgeon');

  const chapterEightIds = [
    'chapter-8-01-ignore-log',
    'chapter-8-02-ignore-directory',
    'chapter-8-03-keep-example-env',
    'chapter-8-04-ignore-cache',
    'chapter-8-05-clean-generated-file',
    'chapter-8-06-hygiene-review'
  ];
  if (chapterEightIds.every((id) => solvedIds.has(id))) unlocked.add('project_janitor');

  const chapterNineIds = [
    'chapter-9-01-find-bad-change',
    'chapter-9-02-create-debug-branch',
    'chapter-9-03-add-failing-test',
    'chapter-9-04-fix-bug',
    'chapter-9-05-merge-debug-fix',
    'chapter-9-06-close-debug-branch'
  ];
  if (chapterNineIds.every((id) => solvedIds.has(id))) unlocked.add('debug_detective');

  const chapterTenIds = [
    'chapter-10-01-release-branch',
    'chapter-10-02-release-notes',
    'chapter-10-03-tag-release',
    'chapter-10-04-merge-release-main',
    'chapter-10-05-push-release',
    'chapter-10-06-final-audit'
  ];
  if (chapterTenIds.every((id) => solvedIds.has(id))) unlocked.add('release_conductor');

  return [...unlocked];
}
