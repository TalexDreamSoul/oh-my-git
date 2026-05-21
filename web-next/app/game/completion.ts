import { BrowserGit } from '../git/browserGit';

const commands = ['cat', 'cd', 'clear', 'cp', 'echo', 'git', 'help', 'ls', 'mkdir', 'mv', 'pwd', 'rm', 'touch'];
const gitSubcommands = ['add', 'branch', 'checkout', 'cherry-pick', 'commit', 'diff', 'init', 'log', 'merge', 'restore', 'rm', 'stash', 'status', 'switch', 'tag'];

function commonPrefix(values: string[]): string {
  if (values.length === 0) return '';
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function splitLine(line: string): string[] {
  return line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
}

export async function completeLine(git: BrowserGit, line: string): Promise<{ line: string; suggestions: string[] }> {
  const hasTrailingSpace = /\s$/.test(line);
  const tokens = splitLine(line);

  if (tokens.length === 0 || (!hasTrailingSpace && tokens.length === 1 && !line.includes(' '))) {
    const current = tokens[0] ?? '';
    const matches = commands.filter((item) => item.startsWith(current));
    if (matches.length === 1) return { line: `${matches[0]} `, suggestions: [] };
    const prefix = commonPrefix(matches);
    return { line: prefix || line, suggestions: matches };
  }

  if (tokens[0] === 'git') {
    if (tokens.length === 1 && hasTrailingSpace) return { line, suggestions: gitSubcommands };

    if (tokens.length === 2 && !hasTrailingSpace) {
      const current = tokens[1];
      const matches = gitSubcommands.filter((item) => item.startsWith(current));
      if (matches.length === 1) return { line: `git ${matches[0]} `, suggestions: [] };
      const prefix = commonPrefix(matches);
      return { line: prefix ? `git ${prefix}` : line, suggestions: matches };
    }

    const subcommand = tokens[1];
    const completingPath = ['add', 'rm', 'restore'].includes(subcommand);
    const completingBranch = ['checkout', 'switch', 'merge', 'cherry-pick'].includes(subcommand);

    if (completingBranch) {
      const current = hasTrailingSpace ? '' : tokens[tokens.length - 1];
      const branches = await git.branches();
      const matches = branches.filter((item) => item.startsWith(current));
      if (matches.length === 1) {
        const base = hasTrailingSpace ? line : line.slice(0, line.length - current.length);
        return { line: `${base}${matches[0]} `, suggestions: [] };
      }
      return { line, suggestions: matches };
    }

    if (!completingPath) return { line, suggestions: [] };
  }

  const current = hasTrailingSpace ? '' : tokens[tokens.length - 1].replace(/^['"]|['"]$/g, '');
  const files = await git.listWorkingFiles();
  const matches = files.filter((item) => item.startsWith(current));
  if (matches.length === 1) {
    const base = hasTrailingSpace ? line : line.slice(0, line.length - current.length);
    return { line: `${base}${matches[0]} `, suggestions: [] };
  }
  const prefix = commonPrefix(matches);
  if (prefix && prefix !== current) {
    const base = hasTrailingSpace ? line : line.slice(0, line.length - current.length);
    return { line: `${base}${prefix}`, suggestions: matches };
  }
  return { line, suggestions: matches };
}
