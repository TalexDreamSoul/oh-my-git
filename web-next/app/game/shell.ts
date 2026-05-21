import { BrowserGit } from '../git/browserGit';

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function colorStatus(label: string): string {
  if (label.includes('未追踪')) return `${c.yellow}${label}${c.reset}`;
  if (label.startsWith('已暂存')) return `${c.green}${label}${c.reset}`;
  if (label.startsWith('未暂存')) return `${c.red}${label}${c.reset}`;
  return `${c.dim}${label}${c.reset}`;
}

export type CommandResult = {
  output: string;
  success: boolean;
};

function unquote(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function splitArgs(command: string): string[] {
  const matches = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  return matches?.map(unquote) ?? [];
}

export async function runCommand(git: BrowserGit, command: string): Promise<CommandResult> {
  const trimmed = command.trim();
  if (!trimmed) return { success: true, output: '' };

  if (trimmed === 'clear') {
    return { success: true, output: '__CLEAR__' };
  }

  if (trimmed === 'help') {
    return {
      success: true,
      output: [
        `${c.bold}${c.cyan}可用命令：${c.reset}`,
        `  ${c.green}touch${c.reset} <file>` ,
        `  ${c.green}echo${c.reset} <text> > <file>`,
        `  ${c.green}echo${c.reset} <text> >> <file>`,
        `  ${c.green}cat${c.reset} <file>` ,
        `  ${c.green}ls${c.reset}`,
        `  ${c.green}mkdir${c.reset} <dir>` ,
        `  ${c.green}rm${c.reset} <file>` ,
        `  ${c.magenta}git add${c.reset} . | ${c.magenta}git add${c.reset} <file>`,
        `  ${c.magenta}git commit${c.reset} -m "message"`,
        `  ${c.magenta}git status${c.reset}`,
        `  ${c.magenta}git log${c.reset}`,
        `  ${c.magenta}git branch${c.reset} [name]`,
        `  ${c.magenta}git checkout${c.reset} <branch|commit>`,
        `  ${c.magenta}git merge${c.reset} <branch>`,
        `  ${c.magenta}git branch -d${c.reset} <branch>`,
        `  ${c.magenta}git stash${c.reset} push|list|apply|pop`,
        `  ${c.magenta}git tag${c.reset} [name]`,
        `  ${c.magenta}git cherry-pick${c.reset} <commit|branch>`,
        `  ${c.magenta}git remote -v${c.reset}`,
        `  ${c.magenta}git push${c.reset} origin main`,
        `  ${c.magenta}git fetch${c.reset} origin`,
        `  ${c.magenta}git pull${c.reset} origin main`,
        `  ${c.magenta}git restore${c.reset} <file>`,
        `  ${c.magenta}git reset${c.reset} <file>`
      ].join('\n')
    };
  }

  const echoAppendMatch = trimmed.match(/^echo\s+(.+?)\s*>>\s*(.+)$/);
  if (echoAppendMatch) {
    const content = unquote(echoAppendMatch[1]);
    const path = unquote(echoAppendMatch[2]);
    await git.appendFile(path, `${content}\n`);
    return { success: true, output: '' };
  }

  const echoRedirectMatch = trimmed.match(/^echo\s+(.+?)\s*>\s*(.+)$/);
  if (echoRedirectMatch) {
    const content = unquote(echoRedirectMatch[1]);
    const path = unquote(echoRedirectMatch[2]);
    await git.writeFile(path, `${content}\n`);
    return { success: true, output: '' };
  }

  const args = splitArgs(trimmed);
  const [program, ...rest] = args;

  if (program === 'touch') {
    if (rest.length === 0) return { success: false, output: 'touch: missing file operand' };
    await Promise.all(rest.map((path) => git.writeFile(path, '')));
    return { success: true, output: '' };
  }

  if (program === 'mkdir') {
    if (rest.length === 0) return { success: false, output: 'mkdir: missing operand' };
    const dirs = rest.filter((item) => item !== '-p');
    await Promise.all(dirs.map((path) => git.mkdir(path)));
    return { success: true, output: '' };
  }

  if (program === 'cat') {
    if (rest.length === 0) return { success: false, output: 'cat: missing file operand' };
    const contents = await Promise.all(rest.map((path) => git.readFile(path)));
    return { success: true, output: contents.join('') };
  }

  if (program === 'ls') {
    const files = await git.listWorkingFiles();
    return { success: true, output: files.map((file) => `${c.blue}${file}${c.reset}`).join('\n') };
  }

  if (program === 'rm') {
    if (rest.length === 0) return { success: false, output: 'rm: missing operand' };
    await Promise.all(rest.map((path) => git.removeFile(path)));
    return { success: true, output: '' };
  }

  if (program !== 'git') {
    return { success: false, output: `${program}: command not found` };
  }

  const [subcommand, ...gitArgs] = rest;

  if (!subcommand) {
    return {
      success: true,
      output: [
        `${c.bold}usage:${c.reset} git <command> [<args>]`,
        '',
        `${c.bold}${c.cyan}常用命令：${c.reset}`,
        `  ${c.magenta}init${c.reset}        初始化仓库`,
        `  ${c.magenta}status${c.reset}      查看文件状态`,
        `  ${c.magenta}add${c.reset}         加入暂存区`,
        `  ${c.magenta}commit${c.reset}      创建提交`,
        `  ${c.magenta}log${c.reset}         查看提交历史`,
        `  ${c.magenta}branch${c.reset}      查看或创建分支`,
        `  ${c.magenta}checkout${c.reset}    切换分支/提交`,
        `  ${c.magenta}stash${c.reset}       临时保存工作区`,
        `  ${c.magenta}tag${c.reset}         标记发布点`,
        `  ${c.magenta}cherry-pick${c.reset} 拣选提交`,
        `  ${c.magenta}rm${c.reset}          删除并暂存删除`
      ].join('\n')
    };
  }

  if (subcommand === 'restore') {
    if (gitArgs.length === 0) return { success: false, output: 'git restore: missing pathspec' };
    await Promise.all(gitArgs.map((path) => git.restoreFile(path)));
    return { success: true, output: '' };
  }

  if (subcommand === 'reset') {
    if (gitArgs.length === 0) return { success: false, output: 'git reset: missing pathspec' };
    await Promise.all(gitArgs.map((path) => git.resetFile(path)));
    return { success: true, output: '' };
  }

  if (subcommand === 'add') {
    const targets = gitArgs.length === 0 ? ['.'] : gitArgs;
    await Promise.all(targets.map((path) => git.add(path)));
    return { success: true, output: '' };
  }

  if (subcommand === 'rm') {
    if (gitArgs.length === 0) return { success: false, output: 'git rm: missing pathspec' };
    await Promise.all(gitArgs.map((path) => git.remove(path)));
    return { success: true, output: '' };
  }

  if (subcommand === 'commit') {
    const messageFlagIndex = gitArgs.findIndex((item) => item === '-m' || item === '--message');
    const message = messageFlagIndex >= 0 ? gitArgs[messageFlagIndex + 1] : 'Commit from terminal';
    const wasResolvingMerge = await git.conflictsResolved();
    const oid = await git.commit(message || 'Commit from terminal');
    const branch = await git.currentBranch();
    return { success: true, output: `[${c.green}${branch ?? 'HEAD'}${c.reset} ${c.yellow}${oid.slice(0, 7)}${c.reset}] ${message}${wasResolvingMerge ? '\nResolved merge conflict.' : ''}` };
  }

  if (subcommand === 'status') {
    const status = await git.status();
    const conflictNote = await git.hasConflicts() ? `${c.red}You have unmerged paths. Fix conflicts and commit the result.${c.reset}\n` : '';
    return {
      success: true,
      output: status.length === 0 ? `${conflictNote}${c.green}nothing to commit, working tree clean${c.reset}` : `${conflictNote}${status.map((item) => `${colorStatus(item.label)}\t${c.blue}${item.filepath}${c.reset}`).join('\n')}`
    };
  }

  if (subcommand === 'log') {
    const log = await git.log();
    return {
      success: true,
      output: log.length === 0 ? `${c.dim}no commits yet${c.reset}` : log.map((commit) => `${c.yellow}${commit.oid.slice(0, 7)}${c.reset} ${commit.message}`).join('\n')
    };
  }

  if (subcommand === 'branch') {
    if (gitArgs.length === 0) {
      const branches = await git.branches();
      const current = await git.currentBranch();
      return { success: true, output: branches.map((branch) => `${branch === current ? `${c.green}*${c.reset}` : ' '} ${c.cyan}${branch}${c.reset}`).join('\n') };
    }
    if (gitArgs[0] === '-d' || gitArgs[0] === '-D') {
      if (!gitArgs[1]) return { success: false, output: 'git branch: missing branch name' };
      await git.deleteBranch(gitArgs[1]);
      return { success: true, output: `Deleted branch ${c.cyan}${gitArgs[1]}${c.reset}` };
    }
    await git.branch(gitArgs[0]);
    return { success: true, output: '' };
  }

  if (subcommand === 'merge') {
    if (gitArgs.length === 0) return { success: false, output: 'git merge: missing branch name' };
    if (gitArgs[0] === '--abort') {
      await git.abortMerge();
      return { success: true, output: 'Merge aborted' };
    }
    await git.merge(gitArgs[0]);
    if (await git.hasConflicts()) {
      const conflictFiles = (await git.status()).filter((item) => item.label.includes('修改')).map((item) => item.filepath);
      const target = conflictFiles.find((item) => item !== '.omg-conflicts.json') || 'shared.txt';
      return { success: false, output: `${c.red}CONFLICT${c.reset}: Merge conflict in ${target}\nAutomatic merge failed; fix conflicts and then commit the result.` };
    }
    return { success: true, output: `Merged ${c.cyan}${gitArgs[0]}${c.reset}` };
  }

  if (subcommand === 'stash') {
    const op = gitArgs[0] || 'push';
    if (op === 'list') {
      const entries = await git.stashList();
      return { success: true, output: entries.length === 0 ? `${c.dim}No stash entries${c.reset}` : entries.map((entry, index) => `${c.yellow}stash@{${index}}${c.reset}: ${entry.message}`).join('\n') };
    }
    if (op === 'push' || op === 'save') {
      const messageFlagIndex = gitArgs.findIndex((item) => item === '-m' || item === '--message');
      const message = messageFlagIndex >= 0 ? gitArgs[messageFlagIndex + 1] : gitArgs.slice(1).join(' ');
      await git.stashPush(message || 'WIP from terminal');
      return { success: true, output: `Saved working directory and index state${message ? `: ${message}` : ''}` };
    }
    if (op === 'apply') {
      await git.stashApply();
      return { success: true, output: 'Applied stash@{0}' };
    }
    if (op === 'pop') {
      await git.stashPop();
      return { success: true, output: 'Dropped refs/stash@{0}' };
    }
    if (op === 'drop') {
      await git.stashDrop();
      return { success: true, output: 'Dropped stash@{0}' };
    }
    if (op === 'clear') {
      await git.stashClear();
      return { success: true, output: '' };
    }
    return { success: false, output: `暂不支持 git stash ${gitArgs.join(' ')}` };
  }

  if (subcommand === 'ignore') {
    if (gitArgs.length === 0) return { success: false, output: 'git ignore: missing pattern' };
    await git.writeGitIgnore(gitArgs[0]);
    return { success: true, output: `Added ${c.yellow}${gitArgs[0]}${c.reset} to .gitignore` };
  }

  if (subcommand === 'tag') {
    if (gitArgs.length === 0) {
      const tags = await git.tags();
      return { success: true, output: tags.length === 0 ? `${c.dim}no tags${c.reset}` : tags.map((tag) => `${c.cyan}${tag}${c.reset}`).join('\n') };
    }
    if (gitArgs[0] === '-d' || gitArgs[0] === '--delete') {
      if (!gitArgs[1]) return { success: false, output: 'git tag: missing tag name' };
      await git.deleteTag(gitArgs[1]);
      return { success: true, output: `Deleted tag '${c.cyan}${gitArgs[1]}${c.reset}'` };
    }
    await git.tag(gitArgs[0], gitArgs[1] || 'HEAD');
    return { success: true, output: '' };
  }

  if (subcommand === 'cherry-pick') {
    if (gitArgs.length === 0) return { success: false, output: 'git cherry-pick: missing commit' };
    await git.cherryPick(gitArgs[0]);
    return { success: true, output: `Finished one cherry-pick: ${c.yellow}${gitArgs[0]}${c.reset}` };
  }

  if (subcommand === 'remote') {
    if (gitArgs[0] === '-v' || gitArgs.length === 0) {
      return { success: true, output: [`origin\thttps://example.invalid/oh-my-git/team.git (fetch)`, `origin\thttps://example.invalid/oh-my-git/team.git (push)`].join('\n') };
    }
    return { success: false, output: `暂不支持 git remote ${gitArgs.join(' ')}` };
  }

  if (subcommand === 'push') {
    const remote = gitArgs[0] || 'origin';
    const branch = gitArgs[1] || await git.currentBranch() || 'main';
    await git.writeFile('push.log', `pushed ${branch} to ${remote}\n`);
    return { success: true, output: `Enumerating objects...\nTo ${c.cyan}${remote}${c.reset}\n * [new branch] ${branch} -> ${branch}` };
  }

  if (subcommand === 'fetch') {
    const remote = gitArgs[0] || 'origin';
    await git.writeFile('fetch.log', `${remote}/main updated\n`);
    return { success: true, output: `From ${c.cyan}${remote}${c.reset}\n * branch main -> FETCH_HEAD\n   origin/main updated` };
  }

  if (subcommand === 'pull') {
    const remote = gitArgs[0] || 'origin';
    const branch = gitArgs[1] || 'main';
    await git.writeFile('teammate.md', `update from teammate\n`);
    await git.writeFile('pull.log', `pulled ${remote}/${branch}\n`);
    return { success: true, output: `From ${c.cyan}${remote}${c.reset}\n * branch ${branch} -> FETCH_HEAD\nFast-forward\n teammate.md | 1 +` };
  }

  if (subcommand === 'checkout' || subcommand === 'switch') {
    if (gitArgs.length === 0) return { success: false, output: `git ${subcommand}: missing branch or commit` };
    await git.checkout(gitArgs[0]);
    const branch = await git.currentBranch();
    return { success: true, output: branch ? `Switched to branch '${c.cyan}${branch}${c.reset}'` : `HEAD is now at ${c.yellow}${gitArgs[0]}${c.reset}` };
  }

  if (subcommand === 'init') {
    await git.init();
    return { success: true, output: 'Initialized empty Git repository' };
  }

  return {
    success: false,
    output: `暂不支持 git ${subcommand ?? ''}`.trim()
  };
}
