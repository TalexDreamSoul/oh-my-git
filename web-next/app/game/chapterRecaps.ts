export type ChapterRecap = {
  chapter: string;
  theme: string;
  summary: string;
  lessons: string[];
  practice: string;
  next: string;
};

export const CHAPTER_RECAPS: ChapterRecap[] = [
  {
    chapter: '第一章：基础冒险',
    theme: '从工作区到第一条分支',
    summary: '你完成了 Git 最核心的日常循环：创建文件、修改内容、暂存、提交，并开始用分支隔离新想法。',
    lessons: ['工作区记录正在编辑的文件。', '暂存区是下一次 commit 的草稿。', '分支让不同方向的工作互不打扰。'],
    practice: '真实项目里，先保持小步提交：每个 commit 只说明一个清晰变化。',
    next: '下一章会学习如何撤销错误、回到过去，以及在 detached HEAD 状态下安全观察历史。'
  },
  {
    chapter: '第二章：时光修补师',
    theme: '撤销、回看与清理',
    summary: '你学会了把误改拿掉、取消暂存、删除已跟踪文件，并理解了“回到旧提交”和“从过去拉出分支”的区别。',
    lessons: ['restore/checkout 可以丢弃工作区误改。', 'reset <file> 只影响暂存区，不删除工作区文件。', 'detached HEAD 适合观察，不适合长期开发。'],
    practice: '真正撤销前先跑 git status 和 git log，确认自己要改的是工作区、暂存区还是历史。',
    next: '接下来进入分支汇合，学习如何把独立路线合回 main。'
  },
  {
    chapter: '第三章：分支汇合',
    theme: '合并分支与收尾',
    summary: '你完成了 fast-forward 与普通 merge 的基本流程，也练习了合并后删除临时分支。',
    lessons: ['merge 会把另一条分支的成果带回当前分支。', '合并前先确认自己站在目标分支上。', '已合并的短期分支应及时删除，降低噪音。'],
    practice: '团队开发中，把功能分支合回 main 前，先确认测试通过并阅读提交图。',
    next: '下一章开始模拟远程协作：查看 remote、push、fetch 与 pull。'
  },
  {
    chapter: '第四章：远程协作',
    theme: '本地与远端同步',
    summary: '你理解了 origin、push、fetch、pull 的关系，并练习了把本地成果同步给团队。',
    lessons: ['remote -v 用来确认远端地址。', 'push 发布本地分支状态。', 'fetch 只取回远端信息，pull 会继续合入工作区。'],
    practice: '协作前先 fetch，再观察差异；不要在不了解远端变化时盲目覆盖。',
    next: '多人同时修改会产生冲突，下一章会进入冲突急救室。'
  },
  {
    chapter: '第五章：冲突急救室',
    theme: '读懂冲突并完成救治',
    summary: '你看到了冲突标记，练习了选择保留内容、暂存解决结果、提交合并，也知道了何时可以 abort。',
    lessons: ['<<<<<<<、=======、>>>>>>> 标出双方不同内容。', '解决冲突后要 add，再 commit。', 'merge --abort 可以回到合并前状态。'],
    practice: '真实冲突不要只机械删除标记，要确认语义正确，必要时和队友沟通。',
    next: '下一章会学习 stash 和 tag：临时收纳工作、标记发布点。'
  },
  {
    chapter: '第六章：临时口袋与版本标签',
    theme: 'stash 暂存现场，tag 固定版本',
    summary: '你掌握了 stash push/list/apply/pop，也练习了创建、检出和删除标签。',
    lessons: ['stash 适合临时切换任务前保存未完成工作。', 'apply 保留 stash，pop 应用后移除 stash。', 'tag 常用来标记发布版本或关键里程碑。'],
    practice: '发布版本时用清晰命名，如 v1.2.0；临时工作恢复后及时清理无用 stash。',
    next: '下一章会做历史外科手术：cherry-pick、修补提交与谨慎整理。'
  },
  {
    chapter: '第七章：历史外科手术',
    theme: '选择性移植与小心改史',
    summary: '你练习了 cherry-pick、拆分提交、重命名记录和发布修补，开始理解历史整理的风险边界。',
    lessons: ['cherry-pick 可以只拿某个提交。', '把大改拆成小提交更利于 review。', '修改历史前要确认是否已经共享给别人。'],
    practice: '只在本地未共享分支上大胆整理；共享分支优先用新提交修复。',
    next: '下一章进入项目卫生：ignore、缓存、生成物和仓库整洁度。'
  },
  {
    chapter: '第八章：项目卫生间',
    theme: '忽略垃圾文件，保留必要模板',
    summary: '你学会了用 .gitignore 管理日志、缓存、生成物，同时保留 .env.example 这类协作文档。',
    lessons: ['忽略规则应该覆盖机器生成或本地私有文件。', '示例配置文件应提交，真实密钥不应提交。', '仓库越干净，review 和协作越轻松。'],
    practice: '每次提交前看 git status，确认没有把日志、缓存、密钥、构建产物带进去。',
    next: '下一章是侦探调试：用提交历史缩小 bug 范围。'
  },
  {
    chapter: '第九章：侦探调试',
    theme: '用分支隔离修复',
    summary: '你围绕一个坏变更建立调试分支、补测试、修复 bug、合并并清理调试分支。',
    lessons: ['调试分支让排查过程不污染主线。', '失败测试能把问题固定下来。', '修复合并后要清理临时分支。'],
    practice: '遇到线上问题时，先复现并写下最小失败用例，再提交修复。',
    next: '下一章会把修复带入发布流程：release 分支、说明、标签与推送。'
  },
  {
    chapter: '第十章：发布列车',
    theme: '组织一次可追踪发布',
    summary: '你走过了 release 分支、发布说明、版本标签、合并回 main 和推送的完整列车。',
    lessons: ['release 分支用于稳定发布候选。', '发布说明解释变化，不只是列提交。', 'tag 和 push 让发布点可以被团队和自动化系统找到。'],
    practice: '发布前做最终审计：版本号、说明、测试结果、目标分支和远端状态。',
    next: '下一章开始整理线性历史，使用 rebase 让分支更易读。'
  },
  {
    chapter: '第十一章：线性历史整理',
    theme: 'rebase 与冲突恢复',
    summary: '你练习了把功能分支变基到 main，也体验了 rebase 冲突、continue 和 abort。',
    lessons: ['rebase 会重放提交，让历史更线性。', '遇到冲突时解决文件、add、再 continue。', '不确定时 abort 比硬撑更安全。'],
    practice: 'rebase 适合整理自己的功能分支；不要随意 rebase 已多人协作的公共分支。',
    next: '下一章会使用 bisect 和 reflog，在时间线上定位和恢复。'
  },
  {
    chapter: '第十二章：时间侦测器',
    theme: 'bisect 定位，reflog 兜底',
    summary: '你用 bisect 标记 good/bad 找到坏提交，也用 reflog 找回丢失方向并建立恢复分支。',
    lessons: ['bisect 用二分法缩小引入问题的提交。', 'reflog 记录 HEAD 走过的位置。', 'recover 分支能把重要历史重新固定住。'],
    practice: '排查前写清楚“好”和“坏”的判定标准，结束后 reset bisect 并记录结论。',
    next: '下一章深入对象仓库，观察 commit、tree、blob 和 tag。'
  },
  {
    chapter: '第十三章：对象仓库',
    theme: '看见 Git 的对象模型',
    summary: '你用 cat-file 查看对象类型和内容，理解 commit 指向 tree，tree 指向 blob，tag 指向版本点。',
    lessons: ['commit 保存元数据、父提交和 tree。', 'tree 描述目录结构。', 'blob 保存文件内容，tag 固定某个对象。'],
    practice: '理解对象模型后，读 log、diff、tag 和 merge 图会更有底气。',
    next: '下一章会回到多人协作进阶：upstream、PR 分支和强推边界。'
  },
  {
    chapter: '第十四章：多人协作进阶',
    theme: '面向团队的安全协作',
    summary: '你完成了 upstream fetch/pull、PR 独立分支、强推风险记录和 PR 前自检。',
    lessons: ['origin/upstream 常用于 fork 协作。', 'PR 应放在独立分支上，便于 review 和更新。', '共享分支禁止随意 force push。'],
    practice: '提交 PR 前确认测试、同步上游、说明清楚，并只推送该 PR 需要的分支。',
    next: '下一章进入综合挑战，把分支、冲突、发布、bisect 和 PR 串成完整任务。'
  },
  {
    chapter: '第十五章：主线综合挑战',
    theme: '把主线技能串成真实任务',
    summary: '你把 hotfix、stash、冲突解决、bisect、标签和 PR 推送组合到更接近真实工作的流程里。',
    lessons: ['综合任务通常跨越多个 Git 技能。', '先保护现场，再修复、验证、发布。', 'PR 前需要整理分支、说明和远端状态。'],
    practice: '真实项目中先写下操作计划，确认当前分支和工作区状态，再执行高风险动作。',
    next: '下一章开启高级工具箱：hooks、blame、patch、worktree、submodule 和 sparse checkout。'
  },
  {
    chapter: '第十六章：高级工具箱',
    theme: '面向大型项目的高级 Git 工具',
    summary: '你初步接触了 hook 策略、blame 追踪、补丁传递、worktree 多工作区、submodule 和 sparse checkout。',
    lessons: ['hooks 用自动化约束提交质量。', 'blame 和 patch 帮助排查与传递局部改动。', 'worktree/submodule/sparse checkout 适合大型仓库协作。'],
    practice: '高级工具要和团队约定配套使用，避免本地技巧变成协作成本。',
    next: '后续可以继续扩展 CI、签名提交、release automation 和更完整的 patch 邮件流。'
  }
];

export function getChapterRecap(chapter: string): ChapterRecap | undefined {
  return CHAPTER_RECAPS.find((item) => item.chapter === chapter);
}
