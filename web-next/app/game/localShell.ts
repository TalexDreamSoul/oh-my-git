import { BrowserGit } from '../git/browserGit';
import { runCommand } from './shell';

export type LocalShellResult = {
  output: string;
  success: boolean;
  clear?: boolean;
  cwd: string;
};

function normalizePath(cwd: string, input: string): string {
  const raw = input.trim() || '.';
  const parts = raw.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function toRepoPath(cwd: string, input: string): string {
  return normalizePath(cwd, input).replace(/^\//, '');
}

function prefixCommandPath(command: string, cwd: string): string {
  if (cwd === '/') return command;

  const pathCommands = ['touch', 'cat', 'rm', 'mkdir'];
  const [program, ...rest] = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  if (!program || !pathCommands.includes(program) || rest.length === 0) return command;

  const rewritten = rest.map((arg) => {
    if (arg.startsWith('-')) return arg;
    const unquoted = arg.replace(/^['"]|['"]$/g, '');
    if (unquoted.startsWith('/')) return unquoted.slice(1);
    return `${cwd.replace(/^\//, '')}/${unquoted}`;
  });
  return [program, ...rewritten].join(' ');
}

export class LocalShell {
  cwd = '/';

  constructor(private readonly git: BrowserGit, private readonly username = 'player') {}

  prompt(branch?: string): string {
    const displayPath = `~/${this.username}${this.cwd === '/' ? '/' : this.cwd}`;
    return `${this.username}:${displayPath}${branch ? ` (${branch})` : ''} $ `;
  }

  async execute(command: string): Promise<LocalShellResult> {
    const trimmed = command.trim();
    if (!trimmed) return { success: true, output: '', cwd: this.cwd };

    if (trimmed === 'clear') {
      return { success: true, output: '', clear: true, cwd: this.cwd };
    }

    if (trimmed === 'pwd') {
      return { success: true, output: this.cwd, cwd: this.cwd };
    }

    const cdMatch = trimmed.match(/^cd(?:\s+(.+))?$/);
    if (cdMatch) {
      this.cwd = normalizePath(this.cwd, cdMatch[1] ?? '/');
      return { success: true, output: '', cwd: this.cwd };
    }

    const cpMatch = trimmed.match(/^cp\s+(.+?)\s+(.+)$/);
    if (cpMatch) {
      const source = toRepoPath(this.cwd, cpMatch[1]);
      const target = toRepoPath(this.cwd, cpMatch[2]);
      const content = await this.git.readFile(source);
      await this.git.writeFile(target, content);
      return { success: true, output: '', cwd: this.cwd };
    }

    const mvMatch = trimmed.match(/^mv\s+(.+?)\s+(.+)$/);
    if (mvMatch) {
      const source = toRepoPath(this.cwd, mvMatch[1]);
      const target = toRepoPath(this.cwd, mvMatch[2]);
      const content = await this.git.readFile(source);
      await this.git.writeFile(target, content);
      await this.git.removeFile(source);
      return { success: true, output: '', cwd: this.cwd };
    }

    const echoRedirectMatch = trimmed.match(/^(echo\s+.+?\s*>{1,2}\s*)(.+)$/);
    if (echoRedirectMatch) {
      const target = echoRedirectMatch[2].trim().replace(/^['"]|['"]$/g, '');
      const repoTarget = target.startsWith('/') ? target.slice(1) : toRepoPath(this.cwd, target);
      return { ...(await runCommand(this.git, `${echoRedirectMatch[1]}${repoTarget}`)), cwd: this.cwd };
    }

    const gitAware = trimmed.startsWith('git ') ? trimmed : prefixCommandPath(trimmed, this.cwd);
    return { ...(await runCommand(this.git, gitAware)), cwd: this.cwd };
  }
}
