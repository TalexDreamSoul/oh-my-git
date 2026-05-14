import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';

type LightningFsWithPromises = LightningFS & {
  promises: {
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    readFile(path: string, options?: { encoding?: string }): Promise<string | Uint8Array>;
    readdir(path: string): Promise<string[]>;
    rm?(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
    unlink(path: string): Promise<void>;
  };
};

export type CommitSummary = {
  oid: string;
  message: string;
  author: string;
  parent: string[];
};

export type RefSummary = {
  name: string;
  oid: string;
  current: boolean;
};

export type FileStatus = {
  filepath: string;
  status: string;
  label: string;
};

function statusLabel(head: number, workdir: number, stage: number): string {
  if (head === 0 && workdir === 2 && stage === 0) return '未追踪';
  if (head === 0 && workdir === 2 && stage === 2) return '已暂存新增';
  if (head === 1 && workdir === 1 && stage === 1) return '已提交';
  if (head === 1 && workdir === 2 && stage === 1) return '未暂存修改';
  if (head === 1 && workdir === 2 && stage === 2) return '已暂存修改';
  if (head === 1 && workdir === 0 && stage === 1) return '未暂存删除';
  if (head === 1 && workdir === 0 && stage === 0) return '已暂存删除';
  return `${head}${workdir}${stage}`;
}

export class BrowserGit {
  readonly fs: LightningFsWithPromises;
  readonly dir: string;

  constructor(namespace = 'oh-my-git-web', dir = '/repo') {
    this.fs = new LightningFS(namespace) as LightningFsWithPromises;
    this.dir = dir;
  }

  async resetStorage(): Promise<void> {
    const pfs = this.fs.promises;
    if (pfs.rm) {
      await pfs.rm(this.dir, { recursive: true, force: true });
      return;
    }

    try {
      await pfs.unlink(this.dir);
    } catch {
      // ignore
    }
  }

  async init(): Promise<void> {
    await this.fs.promises.mkdir(this.dir, { recursive: true });
    await git.init({ fs: this.fs, dir: this.dir, defaultBranch: 'main' });
    await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.name', value: 'Oh My Git Player' });
    await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.email', value: 'player@example.invalid' });
  }

  async mkdir(path: string): Promise<void> {
    await this.fs.promises.mkdir(this.join(path), { recursive: true });
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.ensureParentDir(path);
    await this.fs.promises.writeFile(this.join(path), content);
  }

  async appendFile(path: string, content: string): Promise<void> {
    let previous = '';
    try {
      previous = await this.readFile(path);
    } catch {
      // create file if missing
    }
    await this.writeFile(path, previous + content);
  }

  async readFile(path: string): Promise<string> {
    const content = await this.fs.promises.readFile(this.join(path), { encoding: 'utf8' });
    return String(content);
  }

  async removeFile(path: string): Promise<void> {
    await this.fs.promises.unlink(this.join(path));
  }

  async add(path = '.'): Promise<void> {
    if (path === '.') {
      const files = await this.listWorkingFiles();
      await Promise.all(files.map((filepath) => git.add({ fs: this.fs, dir: this.dir, filepath })));
      return;
    }
    await git.add({ fs: this.fs, dir: this.dir, filepath: path });
  }

  async remove(path: string): Promise<void> {
    await git.remove({ fs: this.fs, dir: this.dir, filepath: path });
  }

  async commit(message: string): Promise<string> {
    return git.commit({
      fs: this.fs,
      dir: this.dir,
      message,
      author: {
        name: 'Oh My Git Player',
        email: 'player@example.invalid'
      }
    });
  }

  async status(): Promise<FileStatus[]> {
    const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
    return matrix.map(([filepath, head, workdir, stage]) => ({
      filepath,
      status: `${head}${workdir}${stage}`,
      label: statusLabel(head, workdir, stage)
    }));
  }

  async logForRef(ref: string): Promise<CommitSummary[]> {
    const commits = await git.log({ fs: this.fs, dir: this.dir, ref, depth: 50 });
    return commits.map(({ oid, commit }) => ({
      oid,
      message: commit.message.trim(),
      author: commit.author.name,
      parent: commit.parent
    }));
  }

  async log(): Promise<CommitSummary[]> {
    try {
      const refs = await this.refs();
      const allCommits = new Map<string, CommitSummary>();
      await Promise.all(
        refs.map(async (ref) => {
          try {
            const commits = await this.logForRef(ref.name);
            for (const commit of commits) {
              allCommits.set(commit.oid, commit);
            }
          } catch {
            // ignore refs without commits
          }
        })
      );
      if (allCommits.size === 0) {
        const commits = await git.log({ fs: this.fs, dir: this.dir, depth: 50 });
        for (const { oid, commit } of commits) {
          allCommits.set(oid, { oid, message: commit.message.trim(), author: commit.author.name, parent: commit.parent });
        }
      }
      return Array.from(allCommits.values());
    } catch {
      return [];
    }
  }

  async refs(): Promise<RefSummary[]> {
    const branches = await this.branches();
    const current = await this.currentBranch();
    const refs: RefSummary[] = [];
    for (const name of branches) {
      try {
        refs.push({ name, oid: await git.resolveRef({ fs: this.fs, dir: this.dir, ref: name }), current: name === current });
      } catch {
        // ignore empty refs
      }
    }
    try {
      const head = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
      if (!refs.some((ref) => ref.oid === head && ref.current)) refs.push({ name: 'HEAD', oid: head, current: !current });
    } catch {
      // no HEAD yet
    }
    return refs;
  }

  async branches(): Promise<string[]> {
    return git.listBranches({ fs: this.fs, dir: this.dir });
  }

  async branch(name: string, object = 'HEAD'): Promise<void> {
    await git.branch({ fs: this.fs, dir: this.dir, ref: name, object });
  }

  async deleteBranch(name: string): Promise<void> {
    await git.deleteBranch({ fs: this.fs, dir: this.dir, ref: name });
  }

  async merge(theirs: string): Promise<void> {
    await git.merge({
      fs: this.fs,
      dir: this.dir,
      theirs,
      fastForward: true,
      abortOnConflict: false,
      author: {
        name: 'Oh My Git Player',
        email: 'player@example.invalid'
      }
    });
  }

  async checkout(ref: string): Promise<void> {
    const branches = await this.branches();
    const target = branches.includes(ref) ? ref : await git.expandOid({ fs: this.fs, dir: this.dir, oid: ref });
    await git.checkout({ fs: this.fs, dir: this.dir, ref: target, force: true, track: false });
  }

  async restoreFile(path: string): Promise<void> {
    await git.checkout({ fs: this.fs, dir: this.dir, filepaths: [path], force: true });
  }

  async resetFile(path: string): Promise<void> {
    await git.resetIndex({ fs: this.fs, dir: this.dir, filepath: path });
  }

  async resetHard(ref = 'HEAD'): Promise<void> {
    await git.checkout({ fs: this.fs, dir: this.dir, ref, force: true });
  }

  async readHeadFile(path: string): Promise<string> {
    const oid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
    const result = await git.readBlob({ fs: this.fs, dir: this.dir, oid, filepath: path });
    return new TextDecoder().decode(result.blob);
  }

  async currentBranch(): Promise<string | undefined> {
    const branch = await git.currentBranch({ fs: this.fs, dir: this.dir, fullname: false });
    return branch || undefined;
  }

  async listWorkingFiles(): Promise<string[]> {
    const result: string[] = [];
    const walk = async (relativeDir: string): Promise<void> => {
      const absoluteDir = relativeDir ? this.join(relativeDir) : this.dir;
      let entries: string[] = [];
      try {
        entries = await this.fs.promises.readdir(absoluteDir);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry === '.git') continue;
        const relativePath = relativeDir ? `${relativeDir}/${entry}` : entry;
        try {
          await this.fs.promises.readdir(this.join(relativePath));
          await walk(relativePath);
        } catch {
          result.push(relativePath);
        }
      }
    };
    await walk('');
    return result.sort();
  }

  private join(path: string): string {
    const cleanPath = path.replace(/^\.\/?/, '').replace(/^\/+/, '');
    return `${this.dir}/${cleanPath}`.replace(/\/+/g, '/');
  }

  private async ensureParentDir(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return;
    parts.pop();
    await this.mkdir(parts.join('/'));
  }
}
