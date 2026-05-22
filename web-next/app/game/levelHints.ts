import type { Level } from './levels';

export type LevelHintPack = {
  concept: string;
  direction: string;
  command: string;
};

function firstCommand(commands: string[]): string {
  return commands[0] ?? 'git status';
}

function commandSequence(commands: string[]): string {
  return commands.length === 0 ? '先运行 `git status` 观察当前状态。' : commands.map((command) => `\`${command}\``).join(' → ');
}

function conditionGoal(level: Level): string {
  const condition = level.win[0];
  if (!condition) return '完成右侧任务列表里的所有条件。';
  switch (condition.type) {
    case 'fileExists':
      return `最终需要看到 ${condition.path} 存在。`;
    case 'fileMissing':
      return `最终需要让 ${condition.path} 不再出现在工作区文件列表中。`;
    case 'fileContentContains':
      return `最终需要让 ${condition.path} 包含 “${condition.content}”。`;
    case 'fileContentContainsAny':
      return `最终需要让 ${condition.path} 包含任务指定的任意一种有效内容。`;
    case 'fileStatus':
      return `最终需要让 ${condition.path} 的状态变成“${condition.label}”。`;
    case 'commitCountAtLeast':
      return `最终需要提交历史里至少有 ${condition.count} 个 commit。`;
    case 'branchExists':
      return `最终需要创建分支 ${condition.name}。`;
    case 'branchMissing':
      return `最终需要删除分支 ${condition.name}。`;
    case 'currentBranch':
      return `最终需要站在 ${condition.name || 'detached HEAD'}。`;
    case 'branchCommitCountAtLeast':
      return `最终需要让 ${condition.branch} 分支至少有 ${condition.count} 个提交。`;
    case 'fileInHeadEquals':
      return `最终需要让最新提交中的 ${condition.path} 精确匹配目标内容。`;
    case 'headFileContains':
      return `最终需要让最新提交中的 ${condition.path} 包含 “${condition.content}”。`;
    case 'tagExists':
      return `最终需要存在标签 ${condition.name}。`;
    case 'tagMissing':
      return `最终需要删除标签 ${condition.name}。`;
    case 'stashCountAtLeast':
      return `最终需要 stash 列表里至少有 ${condition.count} 条记录。`;
    case 'hasConflictMarkers':
      return `最终需要在 ${condition.path} 里观察到冲突标记。`;
    case 'noConflictMarkers':
      return `最终需要清理 ${condition.path} 里的冲突标记。`;
    case 'ignored':
      return `最终需要让 ${condition.path} 被 .gitignore 规则忽略。`;
    case 'reflogContains':
      return `最终需要让 reflog 里出现 “${condition.content}”。`;
    case 'bisectFound':
      return '最终需要让 bisect 推断出第一个坏提交。';
    case 'objectType':
      return `最终需要确认 ${condition.ref ?? 'HEAD'} 是 ${condition.objectType} 对象。`;
    case 'objectContains':
      return `最终需要在 ${condition.ref ?? 'HEAD'} 对象内容中看到 “${condition.content}”。`;
  }
}

export function getLevelHintPack(level: Level): LevelHintPack {
  const concept = level.tutorial[0] ?? conditionGoal(level);
  const direction = `${conditionGoal(level)} 可以先用 \`${firstCommand(level.commands)}\` 起步；每做一步都用 \`git status\` 或右侧任务列表确认。`;
  const command = `参考顺序：${commandSequence(level.commands)}`;
  return {
    concept,
    direction,
    command
  };
}
