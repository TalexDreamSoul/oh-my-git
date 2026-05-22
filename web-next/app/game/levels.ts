import { BrowserGit } from '../git/browserGit';

export type LevelAction =
  | { type: 'writeFile'; path: string; content: string }
  | { type: 'gitInit' }
  | { type: 'gitAdd'; path?: string }
  | { type: 'gitCommit'; message: string }
  | { type: 'gitBranch'; name: string }
  | { type: 'gitRemoveBranch'; name: string }
  | { type: 'gitCheckout'; ref: string }
  | { type: 'gitRemove'; path: string }
  | { type: 'gitMerge'; branch: string }
  | { type: 'gitTag'; name: string; ref?: string }
  | { type: 'gitStashPush'; message?: string }
  | { type: 'gitCherryPick'; ref: string }
  | { type: 'gitIgnore'; pattern: string }
  | { type: 'gitRebase'; onto: string }
  | { type: 'gitReflog'; message: string }
  | { type: 'gitBisectStart' }
  | { type: 'gitBisectGood'; ref?: string }
  | { type: 'gitBisectBad'; ref?: string }
  | { type: 'gitRecoverBranch'; name: string; ref?: string }
  | { type: 'gitPush'; remote?: string; branch?: string }
  | { type: 'gitFetch'; remote?: string; branch?: string };

export type WinCondition =
  | { type: 'commitCountAtLeast'; count: number }
  | { type: 'fileExists'; path: string }
  | { type: 'fileMissing'; path: string }
  | { type: 'fileContentContains'; path: string; content: string }
  | { type: 'fileInHeadEquals'; path: string; content: string }
  | { type: 'fileStatus'; path: string; label: string }
  | { type: 'branchExists'; name: string }
  | { type: 'currentBranch'; name: string }
  | { type: 'branchCommitCountAtLeast'; branch: string; count: number }
  | { type: 'branchMissing'; name: string }
  | { type: 'fileContentContainsAny'; path: string; contents: string[] }
  | { type: 'tagExists'; name: string }
  | { type: 'tagMissing'; name: string }
  | { type: 'stashCountAtLeast'; count: number }
  | { type: 'hasConflictMarkers'; path: string }
  | { type: 'noConflictMarkers'; path: string }
  | { type: 'headFileContains'; path: string; content: string }
  | { type: 'ignored'; path: string }
  | { type: 'reflogContains'; content: string }
  | { type: 'bisectFound' }
  | { type: 'objectType'; ref?: string; path?: string; objectType: 'commit' | 'tree' | 'blob' | 'tag' }
  | { type: 'objectContains'; ref?: string; path?: string; content: string };

export type Level = {
  id: string;
  chapter: string;
  title: string;
  description: string;
  tutorial: string[];
  summary: string;
  difficulty: 1 | 2 | 3;
  commands: string[];
  setup: LevelAction[];
  win: WinCondition[];
};

export const levels: Level[] = [
  {
    id: 'chapter-1-01-create-readme',
    chapter: '第一章：基础冒险',
    title: '01 入职第一天',
    summary: '为新项目创建第一份说明文件。',
    difficulty: 1,
    description: '背景：你加入了一个刚启动的小团队，仓库像一间空办公室，什么说明都没有。为了让后来的人知道这个项目的目标，主管让你先建立第一份 README.md。目标：创建文件，并观察 Git 如何把新文件标记为未追踪。',
    tutorial: ['用 touch 创建 README.md。', '观察右侧文件列表，它会以“未追踪”状态出现。', '未追踪表示 Git 还没有把它纳入版本管理。'],
    commands: ['touch README.md', 'ls', 'git status'],
    setup: [{ type: 'gitInit' }],
    win: [{ type: 'fileExists', path: 'README.md' }]
  },
  {
    id: 'chapter-1-02-write-readme',
    chapter: '第一章：基础冒险',
    title: '02 写下项目说明',
    summary: '把项目目标写进 README。',
    difficulty: 1,
    description: '背景：README.md 已经存在，但它还是空白的。团队成员打开仓库时，需要第一眼就知道项目名称。目标：向 README.md 写入项目说明，并用 cat 确认内容真的写进去了。',
    tutorial: ['用 echo ... > README.md 写入内容。', '用 cat README.md 查看文件内容。', '这一步还没有进入暂存区，只是在工作区修改。'],
    commands: ['echo "Oh My Git" > README.md', 'cat README.md', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: '' }],
    win: [{ type: 'fileContentContains', path: 'README.md', content: 'Oh My Git' }]
  },
  {
    id: 'chapter-1-03-stage-readme',
    chapter: '第一章：基础冒险',
    title: '03 放入暂存区',
    summary: '把准备保存的文件加入暂存区。',
    difficulty: 1,
    description: '背景：你已经写好 README.md，但 Git 还没有把它放进下一次提交的草稿。暂存区就像“准备装箱”的区域，只有放进去的内容才会进入 commit。目标：把 README.md 加入暂存区。',
    tutorial: ['运行 git add README.md。', '暂存区 index 是下一次 commit 的草稿。', '右侧状态应显示“已暂存新增”。'],
    commands: ['git add README.md', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'Oh My Git\n' }],
    win: [{ type: 'fileStatus', path: 'README.md', label: '已暂存新增' }]
  },
  {
    id: 'chapter-1-04-first-commit',
    chapter: '第一章：基础冒险',
    title: '04 第一次存档',
    summary: '创建项目历史里的第一个提交。',
    difficulty: 1,
    description: '背景：README.md 已经被放入暂存区，现在可以给项目做第一次正式存档。commit 就像时间线上的一个节点，记录当前项目状态和一句说明。目标：创建第一个提交，并在提交图上看到它。',
    tutorial: ['运行 git commit -m "initial readme"。', 'commit 会把暂存区保存成一个历史节点。', '中间画布会出现第一个提交。'],
    commands: ['git commit -m "initial readme"', 'git log', 'git status'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\n' },
      { type: 'gitAdd', path: 'README.md' }
    ],
    win: [{ type: 'commitCountAtLeast', count: 1 }]
  },
  {
    id: 'chapter-1-05-change-readme',
    chapter: '第一章：基础冒险',
    title: '05 需求变更',
    summary: '修改已提交过的 README。',
    difficulty: 1,
    description: '背景：第一次提交后，需求发生了变化。主管希望 README.md 补充一句学习目标。Git 会发现工作区里的文件和最近一次提交不同。目标：修改已提交文件，并观察它变成未暂存修改。',
    tutorial: ['用 echo ... >> README.md 追加内容。', '文件会从“已提交”变成“未暂存修改”。', '这说明工作区内容已经不同于最近一次 commit。'],
    commands: ['echo "Learn Git step by step" >> README.md', 'cat README.md', 'git status'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\n' },
      { type: 'gitAdd', path: 'README.md' },
      { type: 'gitCommit', message: 'initial readme' }
    ],
    win: [{ type: 'fileStatus', path: 'README.md', label: '未暂存修改' }]
  },
  {
    id: 'chapter-1-06-second-commit',
    chapter: '第一章：基础冒险',
    title: '06 第二次存档',
    summary: '把新的 README 修改保存成提交。',
    difficulty: 2,
    description: '背景：README 的补充内容已经确认，可以进入历史。一次常见的 Git 工作流是：修改、暂存、提交。目标：把修改后的 README.md 保存成第二个提交，让项目时间线向前推进。',
    tutorial: ['先运行 git add . 暂存所有修改。', '再运行 git commit -m "update readme"。', '提交图会向前增长。'],
    commands: ['git add .', 'git commit -m "update readme"', 'git log'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\nLearn Git step by step\n' },
      { type: 'gitAdd', path: 'README.md' },
      { type: 'gitCommit', message: 'initial readme' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\nLearn Git step by step\nAdd terminal practice\n' }
    ],
    win: [{ type: 'commitCountAtLeast', count: 2 }]
  },
  {
    id: 'chapter-1-07-create-branch',
    chapter: '第一章：基础冒险',
    title: '07 开辟试验分支',
    summary: '创建一条不影响 main 的新路线。',
    difficulty: 2,
    description: '背景：你准备尝试一个新功能，但 main 分支应该保持稳定。分支就像从当前时间点开辟一条平行路线，方便试验而不影响主线。目标：创建 feature 分支，并理解创建分支不会自动切换过去。',
    tutorial: ['运行 git branch feature。', '创建分支不会自动切换过去。', '运行 git branch 可以查看分支列表。'],
    commands: ['git branch feature', 'git branch'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\n' },
      { type: 'gitAdd', path: 'README.md' },
      { type: 'gitCommit', message: 'initial readme' }
    ],
    win: [{ type: 'branchExists', name: 'feature' }]
  },
  {
    id: 'chapter-1-08-checkout-branch',
    chapter: '第一章：基础冒险',
    title: '08 进入试验分支',
    summary: '切换到 feature 分支继续工作。',
    difficulty: 2,
    description: '背景：feature 分支已经存在，但你仍站在 main 上。要在新路线工作，需要先切换过去。checkout 会改变当前所在分支，也会更新工作区内容。目标：切换到 feature 分支。',
    tutorial: ['运行 git checkout feature。', '顶部当前分支会变成 feature。', '之后的新提交会让 feature 分支前进。'],
    commands: ['git branch', 'git checkout feature'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\n' },
      { type: 'gitAdd', path: 'README.md' },
      { type: 'gitCommit', message: 'initial readme' },
      { type: 'gitBranch', name: 'feature' }
    ],
    win: [{ type: 'currentBranch', name: 'feature' }]
  },
  {
    id: 'chapter-1-09-feature-work',
    chapter: '第一章：基础冒险',
    title: '09 在分支上工作',
    summary: '在 feature 分支提交一个小 demo。',
    difficulty: 2,
    description: '背景：你已经进入 feature 分支，可以放心做试验。团队希望先看到一个最小 demo 文件。目标：创建 src/app.js，暂存并提交，让 feature 分支拥有自己的新进展。',
    tutorial: ['用 mkdir -p src 创建目录。', '用 touch src/app.js 创建文件。', '把它 add 并 commit。'],
    commands: ['mkdir -p src', 'touch src/app.js', 'git add .', 'git commit -m "start app"'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\n' },
      { type: 'gitAdd', path: 'README.md' },
      { type: 'gitCommit', message: 'initial readme' },
      { type: 'gitBranch', name: 'feature' },
      { type: 'gitCheckout', ref: 'feature' }
    ],
    win: [{ type: 'currentBranch', name: 'feature' }, { type: 'fileExists', path: 'src/app.js' }, { type: 'commitCountAtLeast', count: 2 }]
  },
  {
    id: 'chapter-1-10-clean-temp',
    chapter: '第一章：基础冒险',
    title: '10 清理临时文件',
    summary: '删除不该进入项目的临时日志。',
    difficulty: 1,
    description: '背景：开发时经常会生成临时日志，例如 debug.log。这类文件通常不应该进入仓库。目标：删除未追踪的临时文件，让工作区恢复整洁。',
    tutorial: ['关卡开始时 debug.log 是一个未追踪文件。', '运行 rm debug.log 删除它。', '右侧文件列表中不应再出现 debug.log。'],
    commands: ['ls', 'rm debug.log', 'git status'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Oh My Git\n' },
      { type: 'gitAdd', path: 'README.md' },
      { type: 'gitCommit', message: 'initial readme' },
      { type: 'writeFile', path: 'debug.log', content: 'temporary logs\n' }
    ],
    win: [{ type: 'fileMissing', path: 'debug.log' }]
  },

  {
    id: 'chapter-2-01-lost-change',
    chapter: '第二章：时光修补师',
    title: '01 误改文件',
    summary: '丢弃工作区里的错误修改。',
    difficulty: 2,
    description: '背景：你误把 README.md 改坏了。幸运的是，这次修改还只在工作区，没有进入暂存区。Git 可以用最近一次提交中的版本覆盖工作区。目标：丢弃工作区的错误修改。',
    tutorial: ['README.md 已经被错误修改。', '使用 git checkout README.md 或 git restore README.md。', '文件状态恢复为“已提交”。'],
    commands: ['cat README.md', 'git checkout README.md', 'git status'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'README.md', content: 'Stable README\n' },
      { type: 'gitAdd', path: 'README.md' },
      { type: 'gitCommit', message: 'stable readme' },
      { type: 'writeFile', path: 'README.md', content: 'BROKEN README\n' }
    ],
    win: [{ type: 'fileStatus', path: 'README.md', label: '已提交' }]
  },
  {
    id: 'chapter-2-02-unstage-file',
    chapter: '第二章：时光修补师',
    title: '02 取消暂存',
    summary: '把误加入暂存区的文件拿出来。',
    difficulty: 2,
    description: '背景：你写了 notes.txt 草稿，却不小心 git add 进了暂存区。如果现在提交，它会进入历史。目标：只取消暂存，不删除文件本身。',
    tutorial: ['notes.txt 已经在暂存区。', '使用 git reset notes.txt 取消暂存。', '它会回到未追踪状态。'],
    commands: ['git status', 'git reset notes.txt', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'notes.txt', content: 'draft\n' }, { type: 'gitAdd', path: 'notes.txt' }],
    win: [{ type: 'fileStatus', path: 'notes.txt', label: '未追踪' }]
  },
  {
    id: 'chapter-2-03-remove-tracked-file',
    chapter: '第二章：时光修补师',
    title: '03 删除旧文件',
    summary: '用 git rm 删除并记录删除。',
    difficulty: 2,
    description: '背景：项目演进时，一些旧文件会被淘汰。直接 rm 只会删除工作区文件，而 git rm 会同时把删除动作放进暂存区。目标：删除 old.txt 并暂存这次删除。',
    tutorial: ['old.txt 是已提交文件。', '使用 git rm old.txt。', '状态会显示“已暂存删除”。'],
    commands: ['git rm old.txt', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'old.txt', content: 'legacy\n' }, { type: 'gitAdd', path: 'old.txt' }, { type: 'gitCommit', message: 'add old file' }],
    win: [{ type: 'fileStatus', path: 'old.txt', label: '已暂存删除' }]
  },
  {
    id: 'chapter-2-04-commit-removal',
    chapter: '第二章：时光修补师',
    title: '04 提交删除',
    summary: '把删除动作保存进历史。',
    difficulty: 2,
    description: '背景：删除文件也是项目历史的一部分。只有提交后，队友拉取代码时才会同步看到这个文件被移除。目标：提交删除动作。',
    tutorial: ['运行 git commit -m "remove old file"。', '提交图会出现第二个节点。', '右侧文件列表不再有 old.txt。'],
    commands: ['git commit -m "remove old file"', 'git log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'old.txt', content: 'legacy\n' }, { type: 'gitAdd', path: 'old.txt' }, { type: 'gitCommit', message: 'add old file' }, { type: 'gitRemove', path: 'old.txt' }],
    win: [{ type: 'commitCountAtLeast', count: 2 }, { type: 'fileMissing', path: 'old.txt' }]
  },
  {
    id: 'chapter-2-05-detached-head',
    chapter: '第二章：时光修补师',
    title: '05 回到过去看看',
    summary: 'checkout 到旧提交进入观察模式。',
    difficulty: 3,
    description: '背景：有时你需要回到过去查看旧版本。checkout 到具体提交时，HEAD 会直接指向提交，而不是分支，这叫 detached HEAD。目标：切换到旧提交，理解“观察过去”和“在分支上工作”的区别。',
    tutorial: ['运行 git log 查看旧提交哈希。', '使用 git checkout HEAD~1 回到上一个提交。', '顶部当前分支会显示为无分支。'],
    commands: ['git log', 'git checkout HEAD~1'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'story.txt', content: 'version 1\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'version 1' }, { type: 'writeFile', path: 'story.txt', content: 'version 2\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'version 2' }],
    win: [{ type: 'currentBranch', name: '' }]
  },
  {
    id: 'chapter-2-06-branch-from-past',
    chapter: '第二章：时光修补师',
    title: '06 从过去开新线',
    summary: '在旧提交上创建修复分支。',
    difficulty: 3,
    description: '背景：回到旧版本后，你发现那里可以开始一条修复路线。但直接在 detached HEAD 上提交容易迷路，所以要先创建分支。目标：从旧提交创建 hotfix 分支。',
    tutorial: ['先用 git checkout HEAD~1 回到上一个提交。', '运行 git branch hotfix。', 'hotfix 应该出现在分支列表中。'],
    commands: ['git log', 'git checkout HEAD~1', 'git branch hotfix'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'story.txt', content: 'version 1\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'version 1' }, { type: 'writeFile', path: 'story.txt', content: 'version 2\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'version 2' }],
    win: [{ type: 'branchExists', name: 'hotfix' }]
  },
  {
    id: 'chapter-2-07-switch-back-main',
    chapter: '第二章：时光修补师',
    title: '07 回到主线',
    summary: '从 detached HEAD 回到 main。',
    difficulty: 2,
    description: '背景：你已经完成旧版本观察，现在需要回到团队主线。切回 main 后，HEAD 再次指向分支，之后的提交会推进 main。目标：从 detached HEAD 回到 main。',
    tutorial: ['当前在旧提交上。', '运行 git checkout main。', '顶部当前分支应该回到 main。'],
    commands: ['git checkout main', 'git branch'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'story.txt', content: 'version 1\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'version 1' }, { type: 'writeFile', path: 'story.txt', content: 'version 2\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'version 2' }, { type: 'gitCheckout', ref: 'HEAD~1' }],
    win: [{ type: 'currentBranch', name: 'main' }]
  },
  {
    id: 'chapter-2-08-clean-working-tree',
    chapter: '第二章：时光修补师',
    title: '08 整理工作区',
    summary: '让工作区重新变干净。',
    difficulty: 2,
    description: '背景：真实工作区经常同时出现多种杂乱状态：已跟踪文件被误改、未追踪日志混在旁边。目标：恢复 README.md，并删除 debug.log，让工作区变干净。',
    tutorial: ['用 git restore README.md 丢弃 README 修改。', '用 rm debug.log 删除未追踪日志。', 'git status 应该显示干净。'],
    commands: ['git restore README.md', 'rm debug.log', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'Stable\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'stable' }, { type: 'writeFile', path: 'README.md', content: 'Broken\n' }, { type: 'writeFile', path: 'debug.log', content: 'logs\n' }],
    win: [{ type: 'fileStatus', path: 'README.md', label: '已提交' }, { type: 'fileMissing', path: 'debug.log' }]
  },
  {
    id: 'chapter-3-01-prepare-merge',
    chapter: '第三章：分支汇合',
    title: '01 两条路线',
    summary: '观察 main 和 feature 的不同进展。',
    difficulty: 2,
    description: '背景：团队在 main 上保持稳定版本，你在 feature 上完成了一个小功能。现在两条路线开始分开。目标：查看分支列表和提交历史，理解合并前的状态。',
    tutorial: ['运行 git branch 查看当前分支。', '运行 git log 查看提交历史。', '注意 feature 比 main 多一个提交。'],
    commands: ['git branch', 'git log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'main\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'main base' }, { type: 'gitBranch', name: 'feature' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }, { type: 'gitCheckout', ref: 'main' }],
    win: [{ type: 'currentBranch', name: 'main' }, { type: 'branchExists', name: 'feature' }]
  },
  {
    id: 'chapter-3-02-fast-forward-merge',
    chapter: '第三章：分支汇合',
    title: '02 快进合并',
    summary: '把 feature 的成果带回 main。',
    difficulty: 2,
    description: '背景：main 自从分出 feature 后没有新的提交，所以 Git 可以直接把 main 指针快进到 feature 的位置。这叫 fast-forward merge。目标：在 main 上合并 feature。',
    tutorial: ['确认当前在 main。', '运行 git merge feature。', 'feature.txt 应该出现在 main 工作区。'],
    commands: ['git branch', 'git merge feature', 'ls'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'main\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'main base' }, { type: 'gitBranch', name: 'feature' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }, { type: 'gitCheckout', ref: 'main' }],
    win: [{ type: 'currentBranch', name: 'main' }, { type: 'fileExists', path: 'feature.txt' }]
  },
  {
    id: 'chapter-3-03-clean-merged-branch',
    chapter: '第三章：分支汇合',
    title: '03 清理已合并分支',
    summary: '删除已经完成使命的 feature 分支。',
    difficulty: 2,
    description: '背景：feature 的成果已经进入 main，这条临时路线完成了使命。删除分支只是删除名字，不会删除已经合并进 main 的提交。目标：删除 feature 分支。',
    tutorial: ['feature 已经合并到 main。', '运行 git branch -d feature。', 'git branch 中不应再看到 feature。'],
    commands: ['git branch -d feature', 'git branch'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'main\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'main base' }, { type: 'gitBranch', name: 'feature' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }, { type: 'gitCheckout', ref: 'main' }, { type: 'gitMerge', branch: 'feature' }],
    win: [{ type: 'branchMissing', name: 'feature' }]
  },
  {
    id: 'chapter-3-04-independent-lines',
    chapter: '第三章：分支汇合',
    title: '04 双方都有进展',
    summary: '观察 main 和 feature 同时前进的情况。',
    difficulty: 3,
    description: '背景：这次 main 和 feature 都有新提交，历史不再是一条直线。合并时 Git 需要把两边的变化结合起来。目标：理解非快进合并前的状态。',
    tutorial: ['main 有 main.txt。', 'feature 有 feature.txt。', '先用 git branch 和 git log 观察。'],
    commands: ['git branch', 'git log', 'ls'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'base.txt', content: 'base\n' }, { type: 'gitAdd', path: 'base.txt' }, { type: 'gitCommit', message: 'base' }, { type: 'gitBranch', name: 'feature' }, { type: 'writeFile', path: 'main.txt', content: 'main work\n' }, { type: 'gitAdd', path: 'main.txt' }, { type: 'gitCommit', message: 'main work' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }, { type: 'gitCheckout', ref: 'main' }],
    win: [{ type: 'currentBranch', name: 'main' }, { type: 'branchExists', name: 'feature' }]
  },
  {
    id: 'chapter-3-05-merge-two-lines',
    chapter: '第三章：分支汇合',
    title: '05 合并两边成果',
    summary: '把 feature 合入已经前进的 main。',
    difficulty: 3,
    description: '背景：main 和 feature 都有各自的新文件。现在需要让 main 同时拥有两边成果。目标：执行 git merge feature，并确认两个文件都存在。',
    tutorial: ['当前在 main。', '运行 git merge feature。', 'main.txt 和 feature.txt 应该同时存在。'],
    commands: ['git merge feature', 'ls', 'git log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'base.txt', content: 'base\n' }, { type: 'gitAdd', path: 'base.txt' }, { type: 'gitCommit', message: 'base' }, { type: 'gitBranch', name: 'feature' }, { type: 'writeFile', path: 'main.txt', content: 'main work\n' }, { type: 'gitAdd', path: 'main.txt' }, { type: 'gitCommit', message: 'main work' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }, { type: 'gitCheckout', ref: 'main' }],
    win: [{ type: 'fileExists', path: 'main.txt' }, { type: 'fileExists', path: 'feature.txt' }]
  },
  {
    id: 'chapter-3-06-verify-clean-after-merge',
    chapter: '第三章：分支汇合',
    title: '06 合并后检查',
    summary: '确认合并后的工作区是干净的。',
    difficulty: 2,
    description: '背景：合并完成后，专业开发者会检查状态，确认没有遗漏的修改。目标：让工作区处于干净状态，并确认 main 上包含 feature 文件。',
    tutorial: ['运行 git status。', '确认输出为 clean。', '确认 feature.txt 仍存在。'],
    commands: ['git status', 'ls'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'base.txt', content: 'base\n' }, { type: 'gitAdd', path: 'base.txt' }, { type: 'gitCommit', message: 'base' }, { type: 'gitBranch', name: 'feature' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }, { type: 'gitCheckout', ref: 'main' }, { type: 'gitMerge', branch: 'feature' }],
    win: [{ type: 'fileStatus', path: 'feature.txt', label: '已提交' }]
  },
  {
    id: 'chapter-4-01-remote-map',
    chapter: '第四章：远程协作',
    title: '01 认识远端',
    summary: '查看团队仓库 origin 的地址。',
    difficulty: 2,
    description: '背景：你的本地仓库现在要接入团队协作。远端仓库 origin 就像团队共享的公告板，大家通过它同步进展。目标：使用 git remote -v 查看远端地址。',
    tutorial: ['运行 git remote -v。', 'origin 是默认远端名称。', 'fetch 表示拉取地址，push 表示推送地址。'],
    commands: ['git remote -v'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'remote lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'remote base' }],
    win: [{ type: 'currentBranch', name: 'main' }]
  },
  {
    id: 'chapter-4-02-push-ready',
    chapter: '第四章：远程协作',
    title: '02 准备推送',
    summary: '创建一份可以推送的个人提交。',
    difficulty: 2,
    description: '背景：推送之前，当前仓库必须先有新的 commit。你要给团队仓库增加一份协作说明，再把它保存进历史。目标：创建 collaboration.md 并提交。',
    tutorial: ['创建 collaboration.md。', '写入 team sync。', 'add 并 commit。'],
    commands: ['echo "team sync" > collaboration.md', 'git add .', 'git commit -m "add collaboration note"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'remote lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'remote base' }],
    win: [{ type: 'fileExists', path: 'collaboration.md' }, { type: 'commitCountAtLeast', count: 2 }]
  },
  {
    id: 'chapter-4-03-push-origin-main',
    chapter: '第四章：远程协作',
    title: '03 推送到 origin',
    summary: '把 main 的成果推给团队。',
    difficulty: 2,
    description: '背景：当前仓库里的提交还只是个人进展。要让团队看到，需要 push 到 origin/main。本游戏会模拟远端推送结果。目标：运行 git push origin main，并看到推送记录。',
    tutorial: ['当前 main 已有一个新提交。', '运行 git push origin main。', 'push.log 会记录模拟推送结果。'],
    commands: ['git push origin main', 'cat push.log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'remote lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'remote base' }, { type: 'writeFile', path: 'collaboration.md', content: 'team sync\n' }, { type: 'gitAdd', path: 'collaboration.md' }, { type: 'gitCommit', message: 'add collaboration note' }],
    win: [{ type: 'fileContentContains', path: 'push.log', content: 'pushed main to origin' }]
  },
  {
    id: 'chapter-4-04-fetch-news',
    chapter: '第四章：远程协作',
    title: '04 获取远端消息',
    summary: 'fetch 远端更新但不自动改工作区。',
    difficulty: 2,
    description: '背景：队友可能已经推送了新进展。fetch 会把远端消息取回来，但不会直接改你的工作区，这是安全观察远端变化的方法。目标：运行 git fetch origin。',
    tutorial: ['运行 git fetch origin。', 'fetch.log 会显示远端有新消息。', '注意工作区文件不会自动改变。'],
    commands: ['git fetch origin', 'cat fetch.log', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'remote lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'remote base' }],
    win: [{ type: 'fileContentContains', path: 'fetch.log', content: 'origin/main updated' }]
  },
  {
    id: 'chapter-4-05-pull-update',
    chapter: '第四章：远程协作',
    title: '05 拉取队友更新',
    summary: 'pull 远端更新并合入工作区。',
    difficulty: 3,
    description: '背景：fetch 只是拿到消息，pull 会进一步把远端变化合入当前分支。这里用模拟文件 teammate.md 表示队友带来的更新。目标：运行 git pull origin main。',
    tutorial: ['运行 git pull origin main。', 'teammate.md 会出现。', '这表示远端变化已经进入工作区。'],
    commands: ['git pull origin main', 'ls', 'cat teammate.md'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'remote lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'remote base' }],
    win: [{ type: 'fileContentContains', path: 'teammate.md', content: 'update from teammate' }]
  },
  {
    id: 'chapter-4-06-sync-check',
    chapter: '第四章：远程协作',
    title: '06 同步后检查',
    summary: '同步完成后确认工作区干净。',
    difficulty: 2,
    description: '背景：团队协作的最后一步是检查状态，确认没有未提交的临时修改。目标：完成一次 pull 后，让 teammate.md 处于已提交状态。',
    tutorial: ['先 pull 远端更新。', '如果出现新文件，add 并 commit。', '最后 git status 应该干净。'],
    commands: ['git pull origin main', 'git add .', 'git commit -m "merge teammate update"', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'remote lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'remote base' }],
    win: [{ type: 'fileStatus', path: 'teammate.md', label: '已提交' }]
  },

  {
    id: 'chapter-5-01-conflict-start',
    chapter: '第五章：冲突急救室',
    title: '01 制造冲突现场',
    summary: '合并两条都改了同一行的分支。',
    difficulty: 3,
    description: '背景：main 和 feature 都修改了 shared.txt 的同一段内容。Git 无法自动判断该保留哪一版，于是会把文件标记成冲突现场。目标：在 main 上 merge feature，并看到冲突标记。',
    tutorial: ['当前在 main，feature 已经有另一版 shared.txt。', '运行 git merge feature。', '打开 shared.txt，观察 <<<<<<<、=======、>>>>>>> 三段冲突标记。'],
    commands: ['git merge feature', 'cat shared.txt', 'git status'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nkeep base\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'base shared note' },
      { type: 'gitBranch', name: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nmain version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'main edits shared note' },
      { type: 'gitCheckout', ref: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nfeature version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'feature edits shared note' },
      { type: 'gitCheckout', ref: 'main' }
    ],
    win: [{ type: 'hasConflictMarkers', path: 'shared.txt' }]
  },
  {
    id: 'chapter-5-02-read-conflict',
    chapter: '第五章：冲突急救室',
    title: '02 读懂冲突标记',
    summary: '理解 HEAD 与对方分支的分界。',
    difficulty: 3,
    description: '背景：冲突文件里的 HEAD 是当前分支版本，MERGE_HEAD 是被合并进来的版本。解决冲突前，需要先读懂两边内容。目标：保留 main version 和 feature version 两行，删除冲突标记。',
    tutorial: ['cat shared.txt 查看冲突。', '用编辑器或 echo 重写 shared.txt。', '最终文件可以包含 main version 与 feature version，但不能再有冲突标记。'],
    commands: ['cat shared.txt', 'echo "title" > shared.txt', 'echo "main version" >> shared.txt', 'echo "feature version" >> shared.txt'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nkeep base\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'base shared note' },
      { type: 'gitBranch', name: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nmain version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'main edits shared note' },
      { type: 'gitCheckout', ref: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nfeature version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'feature edits shared note' },
      { type: 'gitCheckout', ref: 'main' },
      { type: 'gitMerge', branch: 'feature' }
    ],
    win: [{ type: 'fileContentContains', path: 'shared.txt', content: 'main version' }, { type: 'fileContentContains', path: 'shared.txt', content: 'feature version' }, { type: 'noConflictMarkers', path: 'shared.txt' }]
  },
  {
    id: 'chapter-5-03-stage-resolution',
    chapter: '第五章：冲突急救室',
    title: '03 标记已解决',
    summary: '把修好的冲突文件加入暂存区。',
    difficulty: 2,
    description: '背景：删除冲突标记只是修改了工作区。Git 还需要你明确表示“这个文件已经解决好了”。目标：git add shared.txt，让解决结果进入暂存区。',
    tutorial: ['shared.txt 已经被手动修好。', '运行 git add shared.txt。', '状态应显示已暂存修改。'],
    commands: ['git add shared.txt', 'git status'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nkeep base\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'base shared note' },
      { type: 'gitBranch', name: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nmain version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'main edits shared note' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nmain version\nfeature version\n' }
    ],
    win: [{ type: 'fileStatus', path: 'shared.txt', label: '已暂存修改' }]
  },
  {
    id: 'chapter-5-04-commit-resolution',
    chapter: '第五章：冲突急救室',
    title: '04 完成冲突合并',
    summary: '提交冲突解决结果。',
    difficulty: 3,
    description: '背景：冲突文件已经解决并暂存。现在需要一个提交把合并结果固定下来，让历史继续前进。目标：提交解决结果，并确认 shared.txt 已提交。',
    tutorial: ['运行 git commit -m "resolve shared conflict"。', '提交后状态应恢复干净。', 'shared.txt 应同时保留两边的关键内容。'],
    commands: ['git commit -m "resolve shared conflict"', 'git status', 'cat shared.txt'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nkeep base\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'base shared note' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nmain version\nfeature version\n' },
      { type: 'gitAdd', path: 'shared.txt' }
    ],
    win: [{ type: 'commitCountAtLeast', count: 2 }, { type: 'fileStatus', path: 'shared.txt', label: '已提交' }, { type: 'headFileContains', path: 'shared.txt', content: 'feature version' }]
  },
  {
    id: 'chapter-5-05-abort-merge',
    chapter: '第五章：冲突急救室',
    title: '05 撤销危险合并',
    summary: '使用 merge --abort 回到合并前。',
    difficulty: 3,
    description: '背景：有时冲突太复杂，不适合马上解决。merge --abort 可以放弃本次合并，回到合并开始之前。目标：在冲突状态下撤销合并，让 shared.txt 回到 main version。',
    tutorial: ['当前 shared.txt 带有冲突标记。', '运行 git merge --abort。', 'shared.txt 应不再有冲突标记，并保留 main version。'],
    commands: ['git status', 'git merge --abort', 'cat shared.txt'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nkeep base\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'base shared note' },
      { type: 'gitBranch', name: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nmain version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'main edits shared note' },
      { type: 'gitCheckout', ref: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nfeature version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'feature edits shared note' },
      { type: 'gitCheckout', ref: 'main' },
      { type: 'gitMerge', branch: 'feature' }
    ],
    win: [{ type: 'fileContentContains', path: 'shared.txt', content: 'main version' }, { type: 'noConflictMarkers', path: 'shared.txt' }, { type: 'currentBranch', name: 'main' }]
  },
  {
    id: 'chapter-5-06-conflict-clean-room',
    chapter: '第五章：冲突急救室',
    title: '06 复盘后保持干净',
    summary: '重新合并并提交最终版本。',
    difficulty: 3,
    description: '背景：撤销合并后，你决定重新解决冲突。这一次要完成完整流程：merge、编辑、add、commit。目标：最终 shared.txt 同时包含 main version 和 feature version，且工作区干净。',
    tutorial: ['先 git merge feature 进入冲突。', '重写 shared.txt，保留两边内容并删除标记。', 'git add 后 git commit。'],
    commands: ['git merge feature', 'echo "title" > shared.txt', 'echo "main version" >> shared.txt', 'echo "feature version" >> shared.txt', 'git add shared.txt', 'git commit -m "merge shared versions"'],
    setup: [
      { type: 'gitInit' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nkeep base\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'base shared note' },
      { type: 'gitBranch', name: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nmain version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'main edits shared note' },
      { type: 'gitCheckout', ref: 'feature' },
      { type: 'writeFile', path: 'shared.txt', content: 'title\nfeature version\n' },
      { type: 'gitAdd', path: 'shared.txt' },
      { type: 'gitCommit', message: 'feature edits shared note' },
      { type: 'gitCheckout', ref: 'main' }
    ],
    win: [{ type: 'commitCountAtLeast', count: 4 }, { type: 'fileStatus', path: 'shared.txt', label: '已提交' }, { type: 'headFileContains', path: 'shared.txt', content: 'main version' }, { type: 'headFileContains', path: 'shared.txt', content: 'feature version' }]
  },

  {
    id: 'chapter-6-01-stash-work',
    chapter: '第六章：临时口袋与版本标签',
    title: '01 临时保存工作',
    summary: '用 stash 收起未完成修改。',
    difficulty: 2,
    description: '背景：你正在改 README.md，突然需要切换任务。未完成内容还不适合提交，可以先放进 stash 临时口袋。目标：运行 git stash push 保存修改。',
    tutorial: ['README.md 当前是未暂存修改。', '运行 git stash push -m "draft readme"。', 'stash list 中应出现一条记录。'],
    commands: ['git status', 'git stash push -m "draft readme"', 'git stash list'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'stable readme\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'stable readme' }, { type: 'writeFile', path: 'README.md', content: 'stable readme\ndraft idea\n' }],
    win: [{ type: 'stashCountAtLeast', count: 1 }, { type: 'fileStatus', path: 'README.md', label: '已提交' }]
  },
  {
    id: 'chapter-6-02-apply-stash',
    chapter: '第六章：临时口袋与版本标签',
    title: '02 取回临时修改',
    summary: 'apply stash 恢复工作区内容。',
    difficulty: 2,
    description: '背景：紧急任务处理完了，现在要取回刚才收起的 README 草稿。apply 会把 stash 内容应用回来，但不会删除 stash 记录。目标：应用 stash，让 README.md 再次包含 draft idea。',
    tutorial: ['关卡开始时已经有一条 stash。', '运行 git stash apply。', 'README.md 应恢复 draft idea，状态变成未暂存修改。'],
    commands: ['git stash list', 'git stash apply', 'cat README.md'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'stable readme\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'stable readme' }, { type: 'writeFile', path: 'README.md', content: 'stable readme\ndraft idea\n' }, { type: 'gitStashPush', message: 'draft readme' }],
    win: [{ type: 'fileContentContains', path: 'README.md', content: 'draft idea' }, { type: 'fileStatus', path: 'README.md', label: '未暂存修改' }]
  },
  {
    id: 'chapter-6-03-pop-stash',
    chapter: '第六章：临时口袋与版本标签',
    title: '03 取回并清空口袋',
    summary: 'pop stash 应用并移除记录。',
    difficulty: 2,
    description: '背景：如果确定不再需要保留 stash 备份，可以用 pop：它会应用 stash，并在成功后删除那条记录。目标：git stash pop 后恢复 draft idea。',
    tutorial: ['运行 git stash list 看到记录。', '运行 git stash pop。', 'README.md 恢复 draft idea。'],
    commands: ['git stash list', 'git stash pop', 'cat README.md'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'stable readme\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'stable readme' }, { type: 'writeFile', path: 'README.md', content: 'stable readme\ndraft idea\n' }, { type: 'gitStashPush', message: 'draft readme' }],
    win: [{ type: 'fileContentContains', path: 'README.md', content: 'draft idea' }]
  },
  {
    id: 'chapter-6-04-create-release-tag',
    chapter: '第六章：临时口袋与版本标签',
    title: '04 打发布标签',
    summary: '用 tag 标记稳定版本。',
    difficulty: 2,
    description: '背景：团队准备发布 v1.0。tag 就像给某个提交贴上永久标签，方便以后快速找到发布点。目标：在当前提交上创建 v1.0 标签。',
    tutorial: ['当前 HEAD 是稳定提交。', '运行 git tag v1.0。', '运行 git tag 应能看到 v1.0。'],
    commands: ['git tag v1.0', 'git tag'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'CHANGELOG.md', content: 'v1.0 ready\n' }, { type: 'gitAdd', path: 'CHANGELOG.md' }, { type: 'gitCommit', message: 'prepare release' }],
    win: [{ type: 'tagExists', name: 'v1.0' }]
  },
  {
    id: 'chapter-6-05-checkout-tag',
    chapter: '第六章：临时口袋与版本标签',
    title: '05 查看历史发布版',
    summary: 'checkout 到标签进入只读观察。',
    difficulty: 3,
    description: '背景：v1.0 发布后 main 又继续前进。现在产品经理要你查看 v1.0 当时的 CHANGELOG。checkout tag 会进入 detached HEAD，适合观察发布快照。目标：切换到 v1.0，并看到旧内容。',
    tutorial: ['先 git tag 确认有 v1.0。', '运行 git checkout v1.0。', '当前分支应显示为无，CHANGELOG.md 应包含 v1.0 ready。'],
    commands: ['git tag', 'git checkout v1.0', 'cat CHANGELOG.md'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'CHANGELOG.md', content: 'v1.0 ready\n' }, { type: 'gitAdd', path: 'CHANGELOG.md' }, { type: 'gitCommit', message: 'prepare release' }, { type: 'gitTag', name: 'v1.0' }, { type: 'writeFile', path: 'CHANGELOG.md', content: 'v1.0 ready\nnext development\n' }, { type: 'gitAdd', path: 'CHANGELOG.md' }, { type: 'gitCommit', message: 'continue after release' }],
    win: [{ type: 'currentBranch', name: '' }, { type: 'fileContentContains', path: 'CHANGELOG.md', content: 'v1.0 ready' }]
  },
  {
    id: 'chapter-6-06-delete-wrong-tag',
    chapter: '第六章：临时口袋与版本标签',
    title: '06 删除打错的标签',
    summary: '清理错误 tag。',
    difficulty: 2,
    description: '背景：你误把发布标签写成 v1.O（字母 O），这会让自动发布流程找错版本。目标：删除错误标签 v1.O，并保留正确标签 v1.0。',
    tutorial: ['运行 git tag 查看两个标签。', '运行 git tag -d v1.O 删除错误标签。', '确认 v1.0 仍然存在。'],
    commands: ['git tag', 'git tag -d v1.O', 'git tag'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'CHANGELOG.md', content: 'v1.0 ready\n' }, { type: 'gitAdd', path: 'CHANGELOG.md' }, { type: 'gitCommit', message: 'prepare release' }, { type: 'gitTag', name: 'v1.0' }, { type: 'gitTag', name: 'v1.O' }],
    win: [{ type: 'tagExists', name: 'v1.0' }, { type: 'tagMissing', name: 'v1.O' }]
  },

  {
    id: 'chapter-7-01-cherry-pick-intro',
    chapter: '第七章：历史外科手术',
    title: '01 拣选单个修复',
    summary: '把 hotfix 分支的一个提交摘到 main。',
    difficulty: 3,
    description: '背景：hotfix 分支上有一个紧急修复，但整条分支还不适合合并。cherry-pick 可以只摘取某个提交应用到当前分支。目标：在 main 上 cherry-pick hotfix，让 fix.txt 出现。',
    tutorial: ['当前在 main，hotfix 比 main 多一个 fix.txt 提交。', '运行 git cherry-pick hotfix。', 'fix.txt 应出现在 main，并产生新提交。'],
    commands: ['git branch', 'git cherry-pick hotfix', 'ls', 'git log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'app base\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'app base' }, { type: 'gitBranch', name: 'hotfix' }, { type: 'gitCheckout', ref: 'hotfix' }, { type: 'writeFile', path: 'fix.txt', content: 'urgent fix\n' }, { type: 'gitAdd', path: 'fix.txt' }, { type: 'gitCommit', message: 'urgent fix' }, { type: 'gitCheckout', ref: 'main' }],
    win: [{ type: 'currentBranch', name: 'main' }, { type: 'fileExists', path: 'fix.txt' }, { type: 'commitCountAtLeast', count: 2 }]
  },
  {
    id: 'chapter-7-02-revert-by-restore',
    chapter: '第七章：历史外科手术',
    title: '02 安全撤回文件内容',
    summary: '从旧提交恢复单个文件再提交。',
    difficulty: 3,
    description: '背景：最近一次提交把 config.txt 改坏了，但团队不想改写历史。安全做法是从旧版本恢复文件内容，再创建一个新的修复提交。目标：把 config.txt 恢复为 safe=true 并提交。',
    tutorial: ['用 echo "safe=true" > config.txt 恢复安全内容。', 'git add config.txt。', 'git commit -m "restore safe config"。'],
    commands: ['cat config.txt', 'echo "safe=true" > config.txt', 'git add config.txt', 'git commit -m "restore safe config"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'config.txt', content: 'safe=true\n' }, { type: 'gitAdd', path: 'config.txt' }, { type: 'gitCommit', message: 'safe config' }, { type: 'writeFile', path: 'config.txt', content: 'safe=false\n' }, { type: 'gitAdd', path: 'config.txt' }, { type: 'gitCommit', message: 'broken config' }],
    win: [{ type: 'commitCountAtLeast', count: 3 }, { type: 'headFileContains', path: 'config.txt', content: 'safe=true' }]
  },
  {
    id: 'chapter-7-03-amend-last-commit',
    chapter: '第七章：历史外科手术',
    title: '03 修补最后一次提交',
    summary: '用追加提交模拟 amend 的思路。',
    difficulty: 2,
    description: '背景：刚提交的 release.md 漏了一行备注。真实项目里常用 amend 修补最后一次提交；本关用“补一笔提交”先理解修补动作的本质：把遗漏内容补进历史。目标：追加 missing note 并提交。',
    tutorial: ['向 release.md 追加 missing note。', 'git add release.md。', 'git commit -m "add missing release note"。'],
    commands: ['echo "missing note" >> release.md', 'git add release.md', 'git commit -m "add missing release note"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'release.md', content: 'release notes\n' }, { type: 'gitAdd', path: 'release.md' }, { type: 'gitCommit', message: 'release notes' }],
    win: [{ type: 'commitCountAtLeast', count: 2 }, { type: 'headFileContains', path: 'release.md', content: 'missing note' }]
  },
  {
    id: 'chapter-7-04-split-work-commit',
    chapter: '第七章：历史外科手术',
    title: '04 拆分混乱修改',
    summary: '只暂存其中一个文件形成小提交。',
    difficulty: 3,
    description: '背景：你同时改了 docs.md 和 test.md，但它们属于两个主题。干净历史提倡一个提交只做一件事。目标：先只提交 docs.md，让 test.md 继续留在工作区。',
    tutorial: ['查看 git status。', '只运行 git add docs.md。', '提交 docs update，确认 test.md 仍是未追踪或未暂存。'],
    commands: ['git status', 'git add docs.md', 'git commit -m "update docs"', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'base\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }, { type: 'writeFile', path: 'docs.md', content: 'docs update\n' }, { type: 'writeFile', path: 'test.md', content: 'test update\n' }],
    win: [{ type: 'commitCountAtLeast', count: 2 }, { type: 'headFileContains', path: 'docs.md', content: 'docs update' }, { type: 'fileStatus', path: 'test.md', label: '未追踪' }]
  },
  {
    id: 'chapter-7-05-rename-carefully',
    chapter: '第七章：历史外科手术',
    title: '05 小心重命名',
    summary: '移动文件并提交重命名结果。',
    difficulty: 2,
    description: '背景：架构调整时，经常需要移动文件。Git 关注内容变化：你可以 mv 文件，再把删除旧文件和新增新文件一起暂存提交。目标：把 guide.md 移到 docs/guide.md 并提交。',
    tutorial: ['运行 mkdir -p docs。', 'mv guide.md docs/guide.md。', 'git add . 后提交。'],
    commands: ['mkdir -p docs', 'mv guide.md docs/guide.md', 'git add .', 'git commit -m "move guide into docs"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'guide.md', content: 'guide\n' }, { type: 'gitAdd', path: 'guide.md' }, { type: 'gitCommit', message: 'add guide' }],
    win: [{ type: 'fileMissing', path: 'guide.md' }, { type: 'fileExists', path: 'docs/guide.md' }, { type: 'commitCountAtLeast', count: 2 }]
  },
  {
    id: 'chapter-7-06-release-surgery',
    chapter: '第七章：历史外科手术',
    title: '06 发布前复检',
    summary: '综合清理、提交并打标签。',
    difficulty: 3,
    description: '背景：发布前要确保工作区干净，并给最终提交打上版本标签。目标：提交 release-check.md，并创建 v2.0 标签。',
    tutorial: ['创建 release-check.md。', 'git add . 并 commit。', 'git tag v2.0。'],
    commands: ['echo "release ok" > release-check.md', 'git add .', 'git commit -m "release check"', 'git tag v2.0'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'CHANGELOG.md', content: 'v2 plan\n' }, { type: 'gitAdd', path: 'CHANGELOG.md' }, { type: 'gitCommit', message: 'plan v2' }],
    win: [{ type: 'fileStatus', path: 'release-check.md', label: '已提交' }, { type: 'tagExists', name: 'v2.0' }]
  },

  {
    id: 'chapter-8-01-ignore-log',
    chapter: '第八章：项目卫生间',
    title: '01 忽略日志文件',
    summary: '用 .gitignore 屏蔽运行日志。',
    difficulty: 2,
    description: '背景：debug.log 是运行时产生的临时文件，不应该进入版本历史。.gitignore 可以告诉 Git 哪些文件不需要追踪。目标：创建 .gitignore 并写入 debug.log，让日志从文件列表中消失。',
    tutorial: ['运行 echo "debug.log" > .gitignore。', 'debug.log 会被忽略。', '提交 .gitignore，让团队共享忽略规则。'],
    commands: ['echo "debug.log" > .gitignore', 'git add .gitignore', 'git commit -m "ignore debug log"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'hygiene\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }, { type: 'writeFile', path: 'debug.log', content: 'runtime log\n' }],
    win: [{ type: 'ignored', path: 'debug.log' }, { type: 'headFileContains', path: '.gitignore', content: 'debug.log' }]
  },
  {
    id: 'chapter-8-02-ignore-directory',
    chapter: '第八章：项目卫生间',
    title: '02 忽略构建目录',
    summary: '屏蔽 dist/ 这类构建产物。',
    difficulty: 2,
    description: '背景：dist/ 是构建生成目录，通常可由源码重新生成，不适合提交。目标：把 dist/ 加入 .gitignore。',
    tutorial: ['运行 echo "dist/" > .gitignore。', 'dist/bundle.js 应被忽略。', '提交忽略规则。'],
    commands: ['echo "dist/" > .gitignore', 'git add .gitignore', 'git commit -m "ignore dist"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'src/app.js', content: 'console.log("app")\n' }, { type: 'gitAdd', path: 'src/app.js' }, { type: 'gitCommit', message: 'source app' }, { type: 'writeFile', path: 'dist/bundle.js', content: 'built output\n' }],
    win: [{ type: 'ignored', path: 'dist/bundle.js' }, { type: 'headFileContains', path: '.gitignore', content: 'dist/' }]
  },
  {
    id: 'chapter-8-03-keep-example-env',
    chapter: '第八章：项目卫生间',
    title: '03 保留环境变量模板',
    summary: '忽略 .env，但提交 .env.example。',
    difficulty: 2,
    description: '背景：.env 里可能有密钥，不能提交；但 .env.example 可以说明需要哪些变量。目标：忽略 .env，同时提交 .env.example。',
    tutorial: ['写入 .gitignore：.env。', '创建 .env.example。', '只 add .gitignore 和 .env.example 并提交。'],
    commands: ['echo ".env" > .gitignore', 'echo "API_URL=" > .env.example', 'git add .gitignore .env.example', 'git commit -m "document env"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'env lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }, { type: 'writeFile', path: '.env', content: 'TOKEN=secret\n' }],
    win: [{ type: 'ignored', path: '.env' }, { type: 'headFileContains', path: '.env.example', content: 'API_URL=' }]
  },
  {
    id: 'chapter-8-04-ignore-cache',
    chapter: '第八章：项目卫生间',
    title: '04 忽略缓存文件',
    summary: '屏蔽 .cache/ 并保持工作区清爽。',
    difficulty: 2,
    description: '背景：工具缓存会频繁变化，提交它们会制造噪音。目标：让 .cache/data.json 被忽略，并提交 .gitignore。',
    tutorial: ['把 .cache/ 写入 .gitignore。', 'add 并 commit .gitignore。', '缓存文件不应出现在任务文件列表。'],
    commands: ['echo ".cache/" > .gitignore', 'git add .gitignore', 'git commit -m "ignore cache"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'cache lab\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }, { type: 'writeFile', path: '.cache/data.json', content: '{}\n' }],
    win: [{ type: 'ignored', path: '.cache/data.json' }, { type: 'headFileContains', path: '.gitignore', content: '.cache/' }]
  },
  {
    id: 'chapter-8-05-clean-generated-file',
    chapter: '第八章：项目卫生间',
    title: '05 清理误提交产物',
    summary: '删除已经进入历史的构建文件。',
    difficulty: 3,
    description: '背景：build.txt 已经被误提交。新增忽略规则不会自动从历史中删除它，需要 git rm 并提交删除。目标：删除 build.txt，提交删除，并加入忽略规则。',
    tutorial: ['运行 git rm build.txt。', '写入 build.txt 到 .gitignore。', '提交删除与忽略规则。'],
    commands: ['git rm build.txt', 'echo "build.txt" > .gitignore', 'git add .gitignore', 'git commit -m "remove generated build"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'build.txt', content: 'generated\n' }, { type: 'gitAdd', path: 'build.txt' }, { type: 'gitCommit', message: 'accidentally add build' }],
    win: [{ type: 'fileMissing', path: 'build.txt' }, { type: 'headFileContains', path: '.gitignore', content: 'build.txt' }, { type: 'commitCountAtLeast', count: 2 }]
  },
  {
    id: 'chapter-8-06-hygiene-review',
    chapter: '第八章：项目卫生间',
    title: '06 卫生复检',
    summary: '整合忽略规则并提交说明。',
    difficulty: 3,
    description: '背景：项目进入稳定阶段，需要把日志、缓存、环境变量、构建目录统一纳入忽略规则。目标：.gitignore 同时包含 debug.log、.env、dist/、.cache/。',
    tutorial: ['依次向 .gitignore 写入四条规则。', 'git add .gitignore。', '提交 hygiene rules。'],
    commands: ['echo "debug.log" > .gitignore', 'echo ".env" >> .gitignore', 'echo "dist/" >> .gitignore', 'echo ".cache/" >> .gitignore', 'git add .gitignore', 'git commit -m "hygiene rules"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'hygiene review\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }, { type: 'writeFile', path: 'debug.log', content: 'log\n' }, { type: 'writeFile', path: '.env', content: 'TOKEN=secret\n' }, { type: 'writeFile', path: 'dist/bundle.js', content: 'dist\n' }, { type: 'writeFile', path: '.cache/data.json', content: '{}\n' }],
    win: [{ type: 'headFileContains', path: '.gitignore', content: 'debug.log' }, { type: 'headFileContains', path: '.gitignore', content: '.env' }, { type: 'headFileContains', path: '.gitignore', content: 'dist/' }, { type: 'headFileContains', path: '.gitignore', content: '.cache/' }]
  },

  {
    id: 'chapter-9-01-find-bad-change',
    chapter: '第九章：侦探调试',
    title: '01 找到坏版本',
    summary: '用日志定位引入 bug 的提交。',
    difficulty: 2,
    description: '背景：app.txt 现在写着 broken，但上一版还是 working。调试第一步是查看历史，知道最近发生了什么。目标：用 git log 找到历史，并切回上一版观察。',
    tutorial: ['运行 git log 查看两个提交。', '运行 git checkout HEAD~1 回到上一版。', 'app.txt 应显示 working。'],
    commands: ['git log', 'git checkout HEAD~1', 'cat app.txt'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'working\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'working app' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'break app' }],
    win: [{ type: 'currentBranch', name: '' }, { type: 'fileContentContains', path: 'app.txt', content: 'working' }]
  },
  {
    id: 'chapter-9-02-create-debug-branch',
    chapter: '第九章：侦探调试',
    title: '02 建立调试分支',
    summary: '从问题现场开 debug 分支。',
    difficulty: 2,
    description: '背景：你不想在 main 上直接试错，于是从当前提交开一条 debug 分支。目标：创建并切换到 debug 分支。',
    tutorial: ['运行 git branch debug。', '再运行 git checkout debug。', '当前分支应是 debug。'],
    commands: ['git branch debug', 'git checkout debug', 'git branch'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'broken app' }],
    win: [{ type: 'currentBranch', name: 'debug' }]
  },
  {
    id: 'chapter-9-03-add-failing-test',
    chapter: '第九章：侦探调试',
    title: '03 记录失败用例',
    summary: '先提交一个复现 bug 的测试。',
    difficulty: 2,
    description: '背景：修 bug 前，先把失败用例写下来，避免问题以后复发。目标：创建 tests/failing.txt 并提交。',
    tutorial: ['mkdir -p tests。', '写入 should be working。', 'add 并 commit。'],
    commands: ['mkdir -p tests', 'echo "should be working" > tests/failing.txt', 'git add .', 'git commit -m "add failing test"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'broken app' }, { type: 'gitBranch', name: 'debug' }, { type: 'gitCheckout', ref: 'debug' }],
    win: [{ type: 'headFileContains', path: 'tests/failing.txt', content: 'should be working' }, { type: 'commitCountAtLeast', count: 2 }]
  },
  {
    id: 'chapter-9-04-fix-bug',
    chapter: '第九章：侦探调试',
    title: '04 修复 bug',
    summary: '把 broken 改回 working 并提交。',
    difficulty: 2,
    description: '背景：失败用例已经记录，现在可以修复 app.txt。目标：把 app.txt 改为 working 并提交修复。',
    tutorial: ['echo "working" > app.txt。', 'git add app.txt。', 'git commit -m "fix app"。'],
    commands: ['echo "working" > app.txt', 'git add app.txt', 'git commit -m "fix app"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'broken app' }, { type: 'gitBranch', name: 'debug' }, { type: 'gitCheckout', ref: 'debug' }, { type: 'writeFile', path: 'tests/failing.txt', content: 'should be working\n' }, { type: 'gitAdd', path: 'tests/failing.txt' }, { type: 'gitCommit', message: 'add failing test' }],
    win: [{ type: 'headFileContains', path: 'app.txt', content: 'working' }, { type: 'commitCountAtLeast', count: 3 }]
  },
  {
    id: 'chapter-9-05-merge-debug-fix',
    chapter: '第九章：侦探调试',
    title: '05 合并修复',
    summary: '把 debug 分支成果带回 main。',
    difficulty: 3,
    description: '背景：debug 分支已经包含测试和修复，现在要回到 main 合并它。目标：main 上合并 debug，并保留测试文件。',
    tutorial: ['git checkout main。', 'git merge debug。', 'main 上应看到 tests/failing.txt 和 working app。'],
    commands: ['git checkout main', 'git merge debug', 'cat app.txt', 'ls'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'broken app' }, { type: 'gitBranch', name: 'debug' }, { type: 'gitCheckout', ref: 'debug' }, { type: 'writeFile', path: 'tests/failing.txt', content: 'should be working\n' }, { type: 'gitAdd', path: 'tests/failing.txt' }, { type: 'gitCommit', message: 'add failing test' }, { type: 'writeFile', path: 'app.txt', content: 'working\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'fix app' }, { type: 'gitCheckout', ref: 'main' }],
    win: [{ type: 'currentBranch', name: 'main' }, { type: 'fileExists', path: 'tests/failing.txt' }, { type: 'fileContentContains', path: 'app.txt', content: 'working' }]
  },
  {
    id: 'chapter-9-06-close-debug-branch',
    chapter: '第九章：侦探调试',
    title: '06 关闭调试分支',
    summary: '修复合并后删除 debug 分支。',
    difficulty: 2,
    description: '背景：修复已经进入 main，debug 分支完成使命。目标：删除 debug 分支，让分支列表保持整洁。',
    tutorial: ['确认当前在 main。', '运行 git branch -d debug。', 'debug 不应再出现在分支列表。'],
    commands: ['git branch -d debug', 'git branch'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'broken app' }, { type: 'gitBranch', name: 'debug' }, { type: 'gitCheckout', ref: 'debug' }, { type: 'writeFile', path: 'app.txt', content: 'working\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'fix app' }, { type: 'gitCheckout', ref: 'main' }, { type: 'gitMerge', branch: 'debug' }],
    win: [{ type: 'branchMissing', name: 'debug' }, { type: 'currentBranch', name: 'main' }]
  },

  {
    id: 'chapter-10-01-release-branch',
    chapter: '第十章：发布列车',
    title: '01 创建发布分支',
    summary: '从 main 开出 release 分支。',
    difficulty: 2,
    description: '背景：版本发布前，团队会从 main 拉出 release 分支进行最终稳定。目标：创建 release 分支并切换过去。',
    tutorial: ['运行 git branch release。', '运行 git checkout release。', '当前分支应为 release。'],
    commands: ['git branch release', 'git checkout release'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'v1 ready\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'v1 ready' }],
    win: [{ type: 'currentBranch', name: 'release' }]
  },
  {
    id: 'chapter-10-02-release-notes',
    chapter: '第十章：发布列车',
    title: '02 准备发布说明',
    summary: '在 release 分支提交 RELEASE.md。',
    difficulty: 2,
    description: '背景：发布版本需要说明变更内容。目标：创建 RELEASE.md，写入 v1.0，并在 release 分支提交。',
    tutorial: ['echo "v1.0" > RELEASE.md。', 'git add .。', 'git commit -m "release notes"。'],
    commands: ['echo "v1.0" > RELEASE.md', 'git add .', 'git commit -m "release notes"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'v1 ready\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'v1 ready' }, { type: 'gitBranch', name: 'release' }, { type: 'gitCheckout', ref: 'release' }],
    win: [{ type: 'currentBranch', name: 'release' }, { type: 'headFileContains', path: 'RELEASE.md', content: 'v1.0' }]
  },
  {
    id: 'chapter-10-03-tag-release',
    chapter: '第十章：发布列车',
    title: '03 标记发布版本',
    summary: '在 release 分支打 v1.0 标签。',
    difficulty: 2,
    description: '背景：发布点需要可追溯标签。目标：创建 v1.0 标签。',
    tutorial: ['确认 release 分支已提交发布说明。', '运行 git tag v1.0。', '提交图会显示 tag: v1.0。'],
    commands: ['git tag v1.0', 'git tag'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'v1 ready\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'v1 ready' }, { type: 'gitBranch', name: 'release' }, { type: 'gitCheckout', ref: 'release' }, { type: 'writeFile', path: 'RELEASE.md', content: 'v1.0\n' }, { type: 'gitAdd', path: 'RELEASE.md' }, { type: 'gitCommit', message: 'release notes' }],
    win: [{ type: 'tagExists', name: 'v1.0' }]
  },
  {
    id: 'chapter-10-04-merge-release-main',
    chapter: '第十章：发布列车',
    title: '04 回合主线',
    summary: '把 release 分支合回 main。',
    difficulty: 3,
    description: '背景：release 分支稳定后，需要合回 main，让主线记录发布说明。目标：在 main 上 merge release。',
    tutorial: ['git checkout main。', 'git merge release。', 'main 上应存在 RELEASE.md。'],
    commands: ['git checkout main', 'git merge release', 'ls'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'v1 ready\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'v1 ready' }, { type: 'gitBranch', name: 'release' }, { type: 'gitCheckout', ref: 'release' }, { type: 'writeFile', path: 'RELEASE.md', content: 'v1.0\n' }, { type: 'gitAdd', path: 'RELEASE.md' }, { type: 'gitCommit', message: 'release notes' }, { type: 'gitCheckout', ref: 'main' }],
    win: [{ type: 'currentBranch', name: 'main' }, { type: 'fileExists', path: 'RELEASE.md' }]
  },
  {
    id: 'chapter-10-05-push-release',
    chapter: '第十章：发布列车',
    title: '05 推送发布结果',
    summary: '模拟推送 main 到 origin。',
    difficulty: 2,
    description: '背景：发布结果需要同步给团队。目标：运行 git push origin main，让 push.log 记录推送。',
    tutorial: ['运行 git push origin main。', '查看 push.log。', '它应记录 pushed main to origin。'],
    commands: ['git push origin main', 'cat push.log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'v1 ready\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'v1 ready' }, { type: 'writeFile', path: 'RELEASE.md', content: 'v1.0\n' }, { type: 'gitAdd', path: 'RELEASE.md' }, { type: 'gitCommit', message: 'release notes' }, { type: 'gitTag', name: 'v1.0' }],
    win: [{ type: 'fileContentContains', path: 'push.log', content: 'pushed main to origin' }]
  },
  {
    id: 'chapter-10-06-final-audit',
    chapter: '第十章：发布列车',
    title: '06 发布审计',
    summary: '确认标签、发布说明和干净工作区。',
    difficulty: 3,
    description: '背景：发布完成后要做最终审计：版本标签存在、发布说明进入历史、临时分支可清理。目标：确认 v1.0 标签存在，并删除 release 分支。',
    tutorial: ['运行 git tag 查看 v1.0。', '运行 git branch -d release。', '确认 RELEASE.md 已提交。'],
    commands: ['git tag', 'git branch -d release', 'git status'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'v1 ready\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'v1 ready' }, { type: 'gitBranch', name: 'release' }, { type: 'gitCheckout', ref: 'release' }, { type: 'writeFile', path: 'RELEASE.md', content: 'v1.0\n' }, { type: 'gitAdd', path: 'RELEASE.md' }, { type: 'gitCommit', message: 'release notes' }, { type: 'gitTag', name: 'v1.0' }, { type: 'gitCheckout', ref: 'main' }, { type: 'gitMerge', branch: 'release' }],
    win: [{ type: 'tagExists', name: 'v1.0' }, { type: 'branchMissing', name: 'release' }, { type: 'fileStatus', path: 'RELEASE.md', label: '已提交' }]
  },

  {
    id: 'chapter-11-01-rebase-setup',
    chapter: '第十一章：线性历史整理',
    title: '01 认识分叉历史',
    summary: '观察 main 与 feature 同时前进。',
    difficulty: 2,
    description: '背景：main 和 feature 都有新提交，历史出现分叉。rebase 可以把 feature 的工作重新接到 main 后面，让历史看起来更线性。目标：观察当前分支和提交图。',
    tutorial: ['运行 git branch。', '运行 git log。', '注意当前在 feature，main 也有自己的提交。'],
    commands: ['git branch', 'git log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'base.txt', content: 'base\n' }, { type: 'gitAdd', path: 'base.txt' }, { type: 'gitCommit', message: 'base' }, { type: 'gitBranch', name: 'feature' }, { type: 'writeFile', path: 'main.txt', content: 'main work\n' }, { type: 'gitAdd', path: 'main.txt' }, { type: 'gitCommit', message: 'main work' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }],
    win: [{ type: 'currentBranch', name: 'feature' }, { type: 'branchExists', name: 'main' }]
  },
  {
    id: 'chapter-11-02-rebase-feature',
    chapter: '第十一章：线性历史整理',
    title: '02 把 feature 接到 main 后面',
    summary: '运行 git rebase main。',
    difficulty: 3,
    description: '背景：你希望 feature 的提交像是基于最新 main 开发的。目标：在 feature 上运行 git rebase main，让 main.txt 和 feature.txt 同时存在。',
    tutorial: ['确认当前在 feature。', '运行 git rebase main。', 'feature 分支应包含 main.txt 和 feature.txt。'],
    commands: ['git rebase main', 'ls', 'git log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'base.txt', content: 'base\n' }, { type: 'gitAdd', path: 'base.txt' }, { type: 'gitCommit', message: 'base' }, { type: 'gitBranch', name: 'feature' }, { type: 'writeFile', path: 'main.txt', content: 'main work\n' }, { type: 'gitAdd', path: 'main.txt' }, { type: 'gitCommit', message: 'main work' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'feature.txt', content: 'feature work\n' }, { type: 'gitAdd', path: 'feature.txt' }, { type: 'gitCommit', message: 'feature work' }],
    win: [{ type: 'currentBranch', name: 'feature' }, { type: 'fileExists', path: 'main.txt' }, { type: 'fileExists', path: 'feature.txt' }]
  },
  {
    id: 'chapter-11-03-rebase-conflict',
    chapter: '第十一章：线性历史整理',
    title: '03 变基也会冲突',
    summary: 'rebase 遇到同文件修改冲突。',
    difficulty: 3,
    description: '背景：main 和 feature 都改了 story.txt。rebase 需要你像 merge 一样解决冲突。目标：运行 git rebase main 并看到冲突标记。',
    tutorial: ['运行 git rebase main。', '查看 story.txt。', '出现冲突标记表示需要手动解决。'],
    commands: ['git rebase main', 'cat story.txt'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'story.txt', content: 'base\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'base story' }, { type: 'gitBranch', name: 'feature' }, { type: 'writeFile', path: 'story.txt', content: 'main line\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'main story' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'story.txt', content: 'feature line\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'feature story' }],
    win: [{ type: 'hasConflictMarkers', path: 'story.txt' }]
  },
  {
    id: 'chapter-11-04-rebase-continue',
    chapter: '第十一章：线性历史整理',
    title: '04 继续变基',
    summary: '解决冲突后 rebase --continue。',
    difficulty: 3,
    description: '背景：冲突已经出现。你需要保留 main line 和 feature line，删除标记，然后继续 rebase。目标：完成 rebase --continue。',
    tutorial: ['重写 story.txt，保留两边内容。', 'git add story.txt。', 'git rebase --continue。'],
    commands: ['echo "main line" > story.txt', 'echo "feature line" >> story.txt', 'git add story.txt', 'git rebase --continue'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'story.txt', content: 'base\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'base story' }, { type: 'gitBranch', name: 'feature' }, { type: 'writeFile', path: 'story.txt', content: 'main line\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'main story' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'story.txt', content: 'feature line\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'feature story' }, { type: 'gitRebase', onto: 'main' }],
    win: [{ type: 'currentBranch', name: 'feature' }, { type: 'noConflictMarkers', path: 'story.txt' }, { type: 'headFileContains', path: 'story.txt', content: 'feature line' }]
  },
  {
    id: 'chapter-11-05-rebase-abort',
    chapter: '第十一章：线性历史整理',
    title: '05 放弃变基',
    summary: '使用 rebase --abort 回到变基前。',
    difficulty: 3,
    description: '背景：如果冲突太复杂，可以先 abort。目标：在冲突状态下运行 git rebase --abort，回到 feature 分支。',
    tutorial: ['当前 rebase 有冲突。', '运行 git rebase --abort。', '当前分支仍应为 feature。'],
    commands: ['git rebase --abort', 'git branch'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'story.txt', content: 'base\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'base story' }, { type: 'gitBranch', name: 'feature' }, { type: 'writeFile', path: 'story.txt', content: 'main line\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'main story' }, { type: 'gitCheckout', ref: 'feature' }, { type: 'writeFile', path: 'story.txt', content: 'feature line\n' }, { type: 'gitAdd', path: 'story.txt' }, { type: 'gitCommit', message: 'feature story' }, { type: 'gitRebase', onto: 'main' }],
    win: [{ type: 'currentBranch', name: 'feature' }, { type: 'noConflictMarkers', path: 'story.txt' }]
  },
  {
    id: 'chapter-11-06-rebase-rule',
    chapter: '第十一章：线性历史整理',
    title: '06 变基守则',
    summary: '理解公共分支不要随意 rebase。',
    difficulty: 2,
    description: '背景：rebase 会改写提交身份，适合整理自己的本地分支，不适合随意改写已经共享的公共分支。目标：创建 rebase-rule.md 并提交这条团队规则。',
    tutorial: ['写入 do not rebase shared branches。', 'add 并 commit。', '把规则保存进历史。'],
    commands: ['echo "do not rebase shared branches" > rebase-rule.md', 'git add .', 'git commit -m "document rebase rule"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'rebase rules\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }],
    win: [{ type: 'headFileContains', path: 'rebase-rule.md', content: 'do not rebase shared branches' }]
  },

  {
    id: 'chapter-12-01-bisect-start',
    chapter: '第十二章：时间侦测器',
    title: '01 开始二分定位',
    summary: '启动 bisect 标记调查。',
    difficulty: 2,
    description: '背景：历史中某个提交引入了 broken。bisect 会用好/坏标记缩小范围。目标：运行完整的 start / bad / good 流程。',
    tutorial: ['运行 git bisect start。', '用 git bisect bad 标记当前坏版本。', '用 git bisect good HEAD~1 标记上一个好版本。'],
    commands: ['git bisect start', 'git bisect bad', 'git bisect good HEAD~1'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'good\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'good app' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'bad app' }],
    win: [{ type: 'bisectFound' }]
  },
  {
    id: 'chapter-12-02-mark-bad',
    chapter: '第十二章：时间侦测器',
    title: '02 标记坏版本',
    summary: '告诉 Git 当前版本是坏的。',
    difficulty: 2,
    description: '背景：当前 HEAD 已经 broken。目标：运行 git bisect start，再运行 git bisect bad。',
    tutorial: ['git bisect start。', 'git bisect bad。', '还需要 good 标记才能定位。'],
    commands: ['git bisect start', 'git bisect bad'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'good\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'good app' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'bad app' }],
    win: [{ type: 'fileContentContains', path: 'app.txt', content: 'broken' }]
  },
  {
    id: 'chapter-12-03-mark-good',
    chapter: '第十二章：时间侦测器',
    title: '03 标记好版本',
    summary: '用 HEAD~1 标记已知好版本。',
    difficulty: 2,
    description: '背景：上一版是 good。标记 good 后，bisect 就能推断第一个坏提交。目标：运行 git bisect good HEAD~1。',
    tutorial: ['先 start 和 bad。', '运行 git bisect good HEAD~1。', '终端会显示 first bad commit。'],
    commands: ['git bisect start', 'git bisect bad', 'git bisect good HEAD~1'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'good\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'good app' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'bad app' }],
    win: [{ type: 'bisectFound' }]
  },
  {
    id: 'chapter-12-04-reflog-footprints',
    chapter: '第十二章：时间侦测器',
    title: '04 查看 HEAD 足迹',
    summary: '使用 reflog 查看最近操作。',
    difficulty: 2,
    description: '背景：reflog 记录 HEAD 移动足迹，是找回误操作的重要线索。目标：运行 git reflog 并记录一次足迹。',
    tutorial: ['运行 git reflog 查看足迹。', '如果没有记录，先切换分支或提交。', '本关开始已预置一条 checkout 足迹。'],
    commands: ['git reflog'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'base\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'base' }, { type: 'gitReflog', message: 'checkout main' }],
    win: [{ type: 'reflogContains', content: 'checkout main' }]
  },
  {
    id: 'chapter-12-05-recover-branch',
    chapter: '第十二章：时间侦测器',
    title: '05 找回误删分支',
    summary: '从 HEAD 恢复 lost 分支。',
    difficulty: 3,
    description: '背景：你误删了 lost 分支，但 HEAD 还在对应提交附近。可以根据 reflog 重新创建分支名。目标：运行 git recover lost。',
    tutorial: ['运行 git reflog 查看线索。', '运行 git recover lost。', 'lost 分支应重新出现。'],
    commands: ['git reflog', 'git recover lost', 'git branch'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'lost.txt', content: 'important\n' }, { type: 'gitAdd', path: 'lost.txt' }, { type: 'gitCommit', message: 'important work' }, { type: 'gitBranch', name: 'lost' }, { type: 'gitRemoveBranch', name: 'lost' }, { type: 'gitReflog', message: 'deleted lost branch accidentally' }],
    win: [{ type: 'branchExists', name: 'lost' }]
  },
  {
    id: 'chapter-12-06-reset-investigation',
    chapter: '第十二章：时间侦测器',
    title: '06 结束调查',
    summary: 'reset bisect 并记录复盘。',
    difficulty: 2,
    description: '背景：找到坏提交后，要结束 bisect 状态，并记录复盘结果。目标：运行 git bisect reset，然后提交 investigation.md。',
    tutorial: ['运行 git bisect reset。', '写入 culprit found。', '提交 investigation.md。'],
    commands: ['git bisect reset', 'echo "culprit found" > investigation.md', 'git add .', 'git commit -m "document investigation"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'good\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'good app' }, { type: 'writeFile', path: 'app.txt', content: 'broken\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'bad app' }, { type: 'gitBisectStart' }, { type: 'gitBisectBad' }, { type: 'gitBisectGood', ref: 'HEAD~1' }],
    win: [{ type: 'headFileContains', path: 'investigation.md', content: 'culprit found' }]
  },

  {
    id: 'chapter-13-01-object-type',
    chapter: '第十三章：对象仓库',
    title: '01 提交也是对象',
    summary: '用 cat-file 查看 commit 类型。',
    difficulty: 2,
    description: '背景：Git 的历史不是神秘文件夹，而是一组对象。HEAD 指向一个 commit 对象。目标：运行 git cat-file -t HEAD，确认 HEAD 是 commit。',
    tutorial: ['运行 git cat-file -t HEAD。', '输出 commit。', 'commit 对象记录消息、父提交和 tree。'],
    commands: ['git cat-file -t HEAD'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'objects\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'object base' }],
    win: [{ type: 'objectType', ref: 'HEAD', objectType: 'commit' }]
  },
  {
    id: 'chapter-13-02-commit-tree',
    chapter: '第十三章：对象仓库',
    title: '02 commit 指向 tree',
    summary: '打印 commit 内容里的 tree。',
    difficulty: 2,
    description: '背景：commit 对象不会直接保存文件内容，它指向一棵 tree。目标：运行 git cat-file -p HEAD，观察 tree 行。',
    tutorial: ['运行 git cat-file -p HEAD。', '输出里应看到 tree。', 'tree 代表该提交的目录快照。'],
    commands: ['git cat-file -p HEAD'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'tree pointer\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'tree pointer' }],
    win: [{ type: 'objectContains', ref: 'HEAD', content: '<tree>' }]
  },
  {
    id: 'chapter-13-03-blob-content',
    chapter: '第十三章：对象仓库',
    title: '03 blob 保存文件内容',
    summary: '查看某个文件对应的 blob。',
    difficulty: 2,
    description: '背景：文件内容保存在 blob 对象中。目标：运行 git cat-file -p HEAD note.txt，看到 note.txt 的内容。',
    tutorial: ['运行 git cat-file -p HEAD note.txt。', '输出里会有 blob 内容。', 'blob 不知道文件名，文件名由 tree 记录。'],
    commands: ['git cat-file -p HEAD note.txt'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'note.txt', content: 'blob stores content\n' }, { type: 'gitAdd', path: 'note.txt' }, { type: 'gitCommit', message: 'add note blob' }],
    win: [{ type: 'objectType', ref: 'HEAD', path: 'note.txt', objectType: 'blob' }, { type: 'objectContains', ref: 'HEAD', path: 'note.txt', content: 'blob stores content' }]
  },
  {
    id: 'chapter-13-04-parent-chain',
    chapter: '第十三章：对象仓库',
    title: '04 parent 串起历史',
    summary: '理解提交的 parent 指针。',
    difficulty: 2,
    description: '背景：每个普通提交都会记录父提交。历史就是沿着 parent 指针回溯。目标：查看 HEAD 内容，确认它有 parent。',
    tutorial: ['运行 git cat-file -p HEAD。', '观察 parents 行。', '这就是历史链条。'],
    commands: ['git cat-file -p HEAD'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'one.txt', content: 'one\n' }, { type: 'gitAdd', path: 'one.txt' }, { type: 'gitCommit', message: 'one' }, { type: 'writeFile', path: 'two.txt', content: 'two\n' }, { type: 'gitAdd', path: 'two.txt' }, { type: 'gitCommit', message: 'two' }],
    win: [{ type: 'objectContains', ref: 'HEAD', content: 'parents' }]
  },
  {
    id: 'chapter-13-05-tag-points-commit',
    chapter: '第十三章：对象仓库',
    title: '05 tag 标记对象',
    summary: '标签名字指向某个提交。',
    difficulty: 2,
    description: '背景：轻量标签就是一个友好的名字，通常指向 commit。目标：创建 v-object 标签，并确认它指向 commit。',
    tutorial: ['运行 git tag v-object。', '运行 git cat-file -t v-object。', '输出 commit。'],
    commands: ['git tag v-object', 'git cat-file -t v-object'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'release.txt', content: 'object release\n' }, { type: 'gitAdd', path: 'release.txt' }, { type: 'gitCommit', message: 'object release' }],
    win: [{ type: 'tagExists', name: 'v-object' }, { type: 'objectType', ref: 'v-object', objectType: 'commit' }]
  },
  {
    id: 'chapter-13-06-object-map',
    chapter: '第十三章：对象仓库',
    title: '06 画出对象地图',
    summary: '把 commit/tree/blob 关系写进文档。',
    difficulty: 2,
    description: '背景：最后把对象模型总结下来：commit -> tree -> blob。目标：创建 object-map.md 并提交这条关系。',
    tutorial: ['写入 commit -> tree -> blob。', 'git add .', 'git commit。'],
    commands: ['echo "commit -> tree -> blob" > object-map.md', 'git add .', 'git commit -m "document object map"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'object map\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }],
    win: [{ type: 'headFileContains', path: 'object-map.md', content: 'commit -> tree -> blob' }]
  },

  {
    id: 'chapter-14-01-remote-names',
    chapter: '第十四章：多人协作进阶',
    title: '01 origin 与 upstream',
    summary: '理解 fork 协作里的两个远端。',
    difficulty: 2,
    description: '背景：fork 工作流常见两个远端：origin 是你的 fork，upstream 是原项目。目标：记录 origin/upstream 的区别并提交。',
    tutorial: ['运行 git remote -v。', '写入 origin is my fork。', '提交 remote-notes.md。'],
    commands: ['git remote -v', 'echo "origin is my fork" > remote-notes.md', 'git add .', 'git commit -m "document remotes"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'remote workflow\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }],
    win: [{ type: 'headFileContains', path: 'remote-notes.md', content: 'origin is my fork' }]
  },
  {
    id: 'chapter-14-02-fetch-upstream',
    chapter: '第十四章：多人协作进阶',
    title: '02 fetch upstream',
    summary: '安全获取上游更新。',
    difficulty: 2,
    description: '背景：fetch upstream 会拿到原项目更新，但不会直接改工作区。目标：运行 git fetch upstream main，并查看 fetch.log。',
    tutorial: ['运行 git fetch upstream main。', '查看 fetch.log。', '注意工作区仍由你控制。'],
    commands: ['git fetch upstream main', 'cat fetch.log'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'local fork\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'fork base' }],
    win: [{ type: 'fileContentContains', path: 'fetch.log', content: 'upstream/main updated' }]
  },
  {
    id: 'chapter-14-03-sync-main',
    chapter: '第十四章：多人协作进阶',
    title: '03 同步 main',
    summary: '把上游更新拉到本地。',
    difficulty: 2,
    description: '背景：pull upstream main 会把上游更新带进本地工作区。目标：运行 git pull upstream main，让 teammate.md 出现。',
    tutorial: ['运行 git pull upstream main。', '查看 teammate.md。', '它代表上游新提交。'],
    commands: ['git pull upstream main', 'cat teammate.md'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'app.txt', content: 'local fork\n' }, { type: 'gitAdd', path: 'app.txt' }, { type: 'gitCommit', message: 'fork base' }],
    win: [{ type: 'fileContentContains', path: 'teammate.md', content: 'update from teammate' }]
  },
  {
    id: 'chapter-14-04-pr-branch',
    chapter: '第十四章：多人协作进阶',
    title: '04 PR 使用独立分支',
    summary: '不要直接在 main 上堆改动。',
    difficulty: 2,
    description: '背景：提交 PR 时推荐用独立分支，方便 review 和后续更新。目标：创建 pr-fix 分支并提交 fix.txt。',
    tutorial: ['git branch pr-fix。', 'git checkout pr-fix。', '写入 fix ready 并提交。'],
    commands: ['git branch pr-fix', 'git checkout pr-fix', 'echo "fix ready" > fix.txt', 'git add .', 'git commit -m "prepare pr fix"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'pr workflow\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }],
    win: [{ type: 'currentBranch', name: 'pr-fix' }, { type: 'headFileContains', path: 'fix.txt', content: 'fix ready' }]
  },
  {
    id: 'chapter-14-05-force-push-warning',
    chapter: '第十四章：多人协作进阶',
    title: '05 force push 警告',
    summary: '记录强推风险。',
    difficulty: 3,
    description: '背景：force push 会改写远端分支，可能覆盖队友工作。目标：提交 force-push-policy.md，写明 never force push shared branch。',
    tutorial: ['写入 never force push shared branch。', '提交策略文件。', '这是团队协作底线。'],
    commands: ['echo "never force push shared branch" > force-push-policy.md', 'git add .', 'git commit -m "document force push policy"'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'force push policy\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }],
    win: [{ type: 'headFileContains', path: 'force-push-policy.md', content: 'never force push shared branch' }]
  },
  {
    id: 'chapter-14-06-pr-checklist',
    chapter: '第十四章：多人协作进阶',
    title: '06 PR 前自检',
    summary: '推送分支前写好 checklist。',
    difficulty: 3,
    description: '背景：发 PR 前要确认测试、同步上游、说明清楚。目标：提交 PR_CHECKLIST.md，然后推送 pr-fix 分支到 origin。',
    tutorial: ['创建 pr-fix 分支。', '写入 tests pass。', '提交并 git push origin pr-fix。'],
    commands: ['git branch pr-fix', 'git checkout pr-fix', 'echo "tests pass" > PR_CHECKLIST.md', 'git add .', 'git commit -m "add pr checklist"', 'git push origin pr-fix'],
    setup: [{ type: 'gitInit' }, { type: 'writeFile', path: 'README.md', content: 'pr checklist\n' }, { type: 'gitAdd', path: 'README.md' }, { type: 'gitCommit', message: 'base' }],
    win: [{ type: 'headFileContains', path: 'PR_CHECKLIST.md', content: 'tests pass' }, { type: 'fileContentContains', path: 'push.log', content: 'pushed pr-fix to origin' }]
  }

]
;

export async function runAction(git: BrowserGit, action: LevelAction): Promise<void> {
  switch (action.type) {
    case 'gitInit':
      await git.init();
      return;
    case 'writeFile':
      await git.writeFile(action.path, action.content);
      return;
    case 'gitAdd':
      await git.add(action.path ?? '.');
      return;
    case 'gitCommit':
      await git.commit(action.message);
      return;
    case 'gitBranch':
      await git.branch(action.name);
      return;
    case 'gitRemoveBranch':
      await git.deleteBranch(action.name);
      return;
    case 'gitCheckout':
      await git.checkout(action.ref);
      return;
    case 'gitRemove':
      await git.remove(action.path);
      return;
    case 'gitMerge':
      await git.merge(action.branch);
      return;
    case 'gitTag':
      await git.tag(action.name, action.ref ?? 'HEAD');
      return;
    case 'gitStashPush':
      await git.stashPush(action.message ?? 'WIP');
      return;
    case 'gitCherryPick':
      await git.cherryPick(action.ref);
      return;
    case 'gitIgnore':
      await git.writeGitIgnore(action.pattern);
      return;
    case 'gitRebase':
      await git.rebase(action.onto);
      return;
    case 'gitReflog':
      await git.recordReflog(action.message);
      return;
    case 'gitBisectStart':
      await git.bisectStart();
      return;
    case 'gitBisectGood':
      await git.bisectGood(action.ref ?? 'HEAD');
      return;
    case 'gitBisectBad':
      await git.bisectBad(action.ref ?? 'HEAD');
      return;
    case 'gitRecoverBranch':
      await git.recoverBranch(action.name, action.ref ?? 'HEAD');
      return;
    case 'gitPush':
      await git.push(action.remote ?? 'origin', action.branch);
      return;
    case 'gitFetch':
      await git.fetch(action.remote ?? 'origin', action.branch ?? 'main');
      return;
  }
}

export async function checkCondition(git: BrowserGit, condition: WinCondition): Promise<boolean> {
  switch (condition.type) {
    case 'commitCountAtLeast':
      return (await git.log()).length >= condition.count;
    case 'fileExists':
      return (await git.listWorkingFiles()).includes(condition.path);
    case 'fileMissing':
      return !(await git.listWorkingFiles()).includes(condition.path);
    case 'fileContentContains': {
      try {
        return (await git.readFile(condition.path)).includes(condition.content);
      } catch {
        return false;
      }
    }
    case 'fileContentContainsAny': {
      try {
        const content = await git.readFile(condition.path);
        return condition.contents.some((item) => content.includes(item));
      } catch {
        return false;
      }
    }
    case 'fileStatus':
      return (await git.status()).some((item) => item.filepath === condition.path && item.label === condition.label);
    case 'branchExists':
      return (await git.branches()).includes(condition.name);
    case 'branchMissing':
      return !(await git.branches()).includes(condition.name);
    case 'currentBranch':
      return ((await git.currentBranch()) ?? '') === condition.name;
    case 'branchCommitCountAtLeast': {
      try {
        return (await git.logForRef(condition.branch)).length >= condition.count;
      } catch {
        return false;
      }
    }
    case 'fileInHeadEquals': {
      try {
        return (await git.readHeadFile(condition.path)) === condition.content;
      } catch {
        return false;
      }
    }
    case 'headFileContains': {
      try {
        return (await git.readHeadFile(condition.path)).includes(condition.content);
      } catch {
        return false;
      }
    }
    case 'tagExists':
      return (await git.tags()).includes(condition.name);
    case 'tagMissing':
      return !(await git.tags()).includes(condition.name);
    case 'stashCountAtLeast':
      return (await git.stashList()).length >= condition.count;
    case 'hasConflictMarkers': {
      try {
        const content = await git.readFile(condition.path);
        return content.includes('<<<<<<<') && content.includes('=======') && content.includes('>>>>>>>');
      } catch {
        return false;
      }
    }
    case 'noConflictMarkers': {
      try {
        const content = await git.readFile(condition.path);
        return !content.includes('<<<<<<<') && !content.includes('=======') && !content.includes('>>>>>>>');
      } catch {
        return false;
      }
    }
    case 'ignored':
      return (await git.ignoredFiles()).includes(condition.path);
    case 'reflogContains':
      return (await git.reflogEntries()).some((entry) => entry.includes(condition.content));
    case 'bisectFound':
      return Boolean((await git.bisectState()).culprit);
    case 'objectType':
      return (await git.objectType(condition.ref ?? 'HEAD', condition.path)) === condition.objectType;
    case 'objectContains':
      return git.objectContains(condition.ref ?? 'HEAD', condition.content, condition.path);
  }
}

export async function checkWin(git: BrowserGit, conditions: WinCondition[]): Promise<boolean> {
  for (const condition of conditions) {
    if (!(await checkCondition(git, condition))) return false;
  }
  return true;
}
