import { BrowserGit } from '../git/browserGit';

export type LevelAction =
  | { type: 'writeFile'; path: string; content: string }
  | { type: 'gitInit' }
  | { type: 'gitAdd'; path?: string }
  | { type: 'gitCommit'; message: string }
  | { type: 'gitBranch'; name: string }
  | { type: 'gitCheckout'; ref: string }
  | { type: 'gitRemove'; path: string }
  | { type: 'gitMerge'; branch: string };

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
  | { type: 'branchMissing'; name: string };

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
    tutorial: ['运行 git log 查看旧提交哈希。', '使用 git checkout <旧提交哈希>。', '顶部当前分支会显示为无分支。'],
    commands: ['git log', 'git checkout <hash>'],
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
    tutorial: ['先 checkout 到旧提交。', '运行 git branch hotfix。', 'hotfix 应该出现在分支列表中。'],
    commands: ['git log', 'git checkout <hash>', 'git branch hotfix'],
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
    case 'gitCheckout':
      await git.checkout(action.ref);
      return;
    case 'gitRemove':
      await git.remove(action.path);
      return;
    case 'gitMerge':
      await git.merge(action.branch);
      return;
  }
}

export async function checkWin(git: BrowserGit, conditions: WinCondition[]): Promise<boolean> {
  const [commits, files, status, branches, currentBranch] = await Promise.all([
    git.log(),
    git.listWorkingFiles(),
    git.status(),
    git.branches(),
    git.currentBranch()
  ]);

  for (const condition of conditions) {
    switch (condition.type) {
      case 'commitCountAtLeast':
        if (commits.length < condition.count) return false;
        break;
      case 'fileExists':
        if (!files.includes(condition.path)) return false;
        break;
      case 'fileMissing':
        if (files.includes(condition.path)) return false;
        break;
      case 'fileContentContains': {
        try {
          const content = await git.readFile(condition.path);
          if (!content.includes(condition.content)) return false;
        } catch {
          return false;
        }
        break;
      }
      case 'fileStatus': {
        const file = status.find((item) => item.filepath === condition.path);
        if (file?.label !== condition.label) return false;
        break;
      }
      case 'branchExists':
        if (!branches.includes(condition.name)) return false;
        break;
      case 'branchMissing':
        if (branches.includes(condition.name)) return false;
        break;
      case 'currentBranch':
        if ((currentBranch ?? '') !== condition.name) return false;
        break;
      case 'branchCommitCountAtLeast': {
        try {
          const branchCommits = await git.logForRef(condition.branch);
          if (branchCommits.length < condition.count) return false;
        } catch {
          return false;
        }
        break;
      }
      case 'fileInHeadEquals':
        // TODO: implement with git.readBlob once levels need it.
        return false;
    }
  }
  return true;
}
