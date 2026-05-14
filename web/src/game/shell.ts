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
    const oid = await git.commit(message || 'Commit from terminal');
    const branch = await git.currentBranch();
    return { success: true, output: `[${c.green}${branch ?? 'HEAD'}${c.reset} ${c.yellow}${oid.slice(0, 7)}${c.reset}] ${message}` };
  }

  if (subcommand === 'status') {
    const status = await git.status();
    return {
      success: true,
      output: status.length === 0 ? `${c.green}nothing to commit, working tree clean${c.reset}` : status.map((item) => `${colorStatus(item.label)}\t${c.blue}${item.filepath}${c.reset}`).join('\n')
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
    await git.branch(gitArgs[0]);
    return { success: true, output: '' };
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
