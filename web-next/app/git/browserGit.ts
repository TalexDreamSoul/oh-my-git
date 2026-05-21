import git, { TREE, WalkerEntry } from 'isomorphic-git';
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

type SnapshotEntry = { path: string; type: 'blob'; oid: string; mode: string };

type StoredConflict = {
  path: string;
  ours: string;
  theirs: string;
  base: string;
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
  readonly namespace: string;

  constructor(namespace = 'oh-my-git-web', dir = '/repo') {
    this.namespace = namespace;
    this.fs = new LightningFS(namespace) as LightningFsWithPromises;
    this.dir = dir;
  }

  async resetStorage(): Promise<void> {
    const pfs = this.fs.promises;
    if (pfs.rm) {
      await pfs.rm(this.dir, { recursive: true, force: true });
    } else {
      try {
        await pfs.unlink(this.dir);
      } catch {
        // ignore
      }
    }
    await this.clearConflictState();
    await this.clearStashMetadata();
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
      const status = await this.status();
      const deleted = status.filter((item) => item.label === '未暂存删除').map((item) => item.filepath);
      await Promise.all(files.map((filepath) => git.add({ fs: this.fs, dir: this.dir, filepath })));
      await Promise.all(deleted.map((filepath) => git.remove({ fs: this.fs, dir: this.dir, filepath })));
      return;
    }
    await git.add({ fs: this.fs, dir: this.dir, filepath: path });
  }

  async remove(path: string): Promise<void> {
    await git.remove({ fs: this.fs, dir: this.dir, filepath: path });
  }

  async commit(message: string): Promise<string> {
    const conflictsResolved = await this.conflictsResolved();
    const oid = await git.commit({
      fs: this.fs,
      dir: this.dir,
      message,
      author: {
        name: 'Oh My Git Player',
        email: 'player@example.invalid'
      }
    });
    if (conflictsResolved) await this.clearConflictState();
    return oid;
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
    for (const name of await this.tags()) {
      try {
        refs.push({ name: `tag: ${name}`, oid: await git.resolveRef({ fs: this.fs, dir: this.dir, ref: `refs/tags/${name}` }), current: false });
      } catch {
        // ignore broken tags
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
    await git.branch({ fs: this.fs, dir: this.dir, ref: name, object: await this.resolveRevision(object) });
  }

  async deleteBranch(name: string): Promise<void> {
    await git.deleteBranch({ fs: this.fs, dir: this.dir, ref: name });
  }

  async tags(): Promise<string[]> {
    try {
      return await git.listTags({ fs: this.fs, dir: this.dir });
    } catch {
      return [];
    }
  }

  async tag(name: string, ref = 'HEAD'): Promise<void> {
    await git.tag({ fs: this.fs, dir: this.dir, ref: name, object: await this.resolveRevision(ref) });
  }

  async deleteTag(name: string): Promise<void> {
    await git.deleteTag({ fs: this.fs, dir: this.dir, ref: name });
  }

  async merge(theirs: string): Promise<void> {
    const headBefore = await this.headOid().catch(() => '');
    try {
      await git.merge({
        fs: this.fs,
        dir: this.dir,
        theirs,
        fastForward: true,
        abortOnConflict: true,
        author: {
          name: 'Oh My Git Player',
          email: 'player@example.invalid'
        }
      });
      await this.clearConflictState();
    } catch (error) {
      const conflicts = await this.detectTextConflicts(headBefore, await this.resolveRevision(theirs));
      if (conflicts.length === 0) throw error;
      await this.writeConflictFiles(conflicts);
    }
  }

  async abortMerge(): Promise<void> {
    const conflicts = await this.readConflictState();
    for (const conflict of conflicts) await this.writeFile(conflict.path, conflict.ours);
    await this.clearConflictState();
    await git.abortMerge({ fs: this.fs, dir: this.dir }).catch(() => undefined);
  }

  async hasConflicts(): Promise<boolean> {
    const conflicts = await this.readConflictState();
    if (conflicts.length === 0) return false;
    for (const conflict of conflicts) {
      try {
        const content = await this.readFile(conflict.path);
        if (content.includes('<<<<<<<')) return true;
      } catch {
        return true;
      }
    }
    return false;
  }

  async conflictsResolved(): Promise<boolean> {
    const conflicts = await this.readConflictState();
    if (conflicts.length === 0) return false;
    for (const conflict of conflicts) {
      try {
        const content = await this.readFile(conflict.path);
        if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  async checkout(ref: string): Promise<void> {
    const branches = await this.branches();
    const target = branches.includes(ref) ? ref : await this.resolveRevision(ref);
    await git.checkout({ fs: this.fs, dir: this.dir, ref: target, force: true, track: false });
  }

  async cherryPick(ref: string): Promise<void> {
    await git.cherryPick({
      fs: this.fs,
      dir: this.dir,
      oid: await this.resolveRevision(ref),
      committer: {
        name: 'Oh My Git Player',
        email: 'player@example.invalid'
      }
    });
  }

  async stashPush(message = ''): Promise<void> {
    const files = await this.listWorkingFiles();
    const entries = await Promise.all(files.map(async (path) => ({ path, content: await this.readFile(path) })));
    const previous = await this.stashList();
    await git.stash({ fs: this.fs, dir: this.dir, op: 'push', message });
    await this.writeStashMetadata([{ message: message || 'WIP', entries }, ...previous]);
  }

  async stashApply(index = 0): Promise<void> {
    const metadata = await this.stashList();
    await git.stash({ fs: this.fs, dir: this.dir, op: 'apply', refIdx: index });
    const entry = metadata[index];
    if (entry) {
      for (const file of entry.entries) await this.writeFile(file.path, file.content);
    }
  }

  async stashPop(index = 0): Promise<void> {
    await this.stashApply(index);
    await this.stashDrop(index);
  }

  async stashDrop(index = 0): Promise<void> {
    await git.stash({ fs: this.fs, dir: this.dir, op: 'drop', refIdx: index }).catch(() => undefined);
    const metadata = await this.stashList();
    await this.writeStashMetadata(metadata.filter((_, itemIndex) => itemIndex !== index));
  }

  async stashClear(): Promise<void> {
    await git.stash({ fs: this.fs, dir: this.dir, op: 'clear' }).catch(() => undefined);
    await this.writeStashMetadata([]);
  }

  async stashList(): Promise<Array<{ message: string; entries: Array<{ path: string; content: string }> }>> {
    const metadata = await this.readStashMetadata();
    if (metadata.length > 0) return metadata;
    const result = await git.stash({ fs: this.fs, dir: this.dir, op: 'list' }) as unknown;
    if (Array.isArray(result)) {
      return result.map((entry, index) => {
        if (typeof entry === 'string') return { message: entry, entries: [] };
        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>;
          return { message: String(record.message || record.ref || `stash@{${index}}`), entries: [] };
        }
        return { message: `stash@{${index}}`, entries: [] };
      });
    }
    if (typeof result === 'string') return result.split('\n').filter(Boolean).map((message) => ({ message, entries: [] }));
    return [];
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

  async readFileAtRef(ref: string, path: string): Promise<string> {
    const oid = await this.resolveRevision(ref);
    const result = await git.readBlob({ fs: this.fs, dir: this.dir, oid, filepath: path });
    return new TextDecoder().decode(result.blob);
  }

  async headOid(): Promise<string> {
    return git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
  }

  async resolveRevision(ref: string): Promise<string> {
    const trimmed = ref.trim();
    if (trimmed === '') return git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });

    const ancestorMatch = trimmed.match(/^(.+?)(?:~(\d*)|\^(\d*))$/);
    if (ancestorMatch) {
      let oid = await this.resolveRevision(ancestorMatch[1]);
      const steps = Number(ancestorMatch[2] || ancestorMatch[3] || 1);
      for (let index = 0; index < steps; index += 1) {
        const { commit } = await git.readCommit({ fs: this.fs, dir: this.dir, oid });
        const parent = commit.parent[0];
        if (!parent) throw new Error(`Revision ${trimmed} has no parent`);
        oid = parent;
      }
      return oid;
    }

    try {
      return await git.resolveRef({ fs: this.fs, dir: this.dir, ref: trimmed });
    } catch {
      try {
        return await git.resolveRef({ fs: this.fs, dir: this.dir, ref: `refs/tags/${trimmed}` });
      } catch {
        return git.expandOid({ fs: this.fs, dir: this.dir, oid: trimmed });
      }
    }
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

  private async snapshot(ref: string): Promise<Map<string, SnapshotEntry>> {
    const rows = await git.walk({
      fs: this.fs,
      dir: this.dir,
      trees: [TREE({ ref })],
      map: async (filepath: string, [entry]: Array<WalkerEntry | null>) => {
        if (filepath === '.' || !entry) return null;
        const type = await entry.type();
        if (type !== 'blob') return null;
        return { path: filepath, type, oid: await entry.oid(), mode: String(await entry.mode()) } satisfies SnapshotEntry;
      },
      reduce: async (_parent: unknown, children: Array<SnapshotEntry | SnapshotEntry[] | null>) => children.flat().filter(Boolean)
    }) as SnapshotEntry[];
    return new Map(rows.map((entry) => [entry.path, entry]));
  }

  private async findMergeBase(ours: string, theirs: string): Promise<string | null> {
    const seen = new Set<string>();
    const collect = async (oid: string) => {
      const queue = [oid];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (seen.has(current)) continue;
        seen.add(current);
        const { commit } = await git.readCommit({ fs: this.fs, dir: this.dir, oid: current });
        queue.push(...commit.parent);
      }
    };
    await collect(ours);

    const queue = [theirs];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) return current;
      const { commit } = await git.readCommit({ fs: this.fs, dir: this.dir, oid: current });
      queue.push(...commit.parent);
    }
    return null;
  }

  private async readOptionalFileAtRef(ref: string, path: string): Promise<string> {
    try {
      return await this.readFileAtRef(ref, path);
    } catch {
      return '';
    }
  }

  private async detectTextConflicts(ours: string, theirs: string): Promise<StoredConflict[]> {
    const base = await this.findMergeBase(ours, theirs);
    if (!base) return [];
    const oursSnapshot = await this.snapshot(ours);
    const theirsSnapshot = await this.snapshot(theirs);
    const baseSnapshot = await this.snapshot(base);
    const paths = new Set([...oursSnapshot.keys(), ...theirsSnapshot.keys(), ...baseSnapshot.keys()]);
    const conflicts: StoredConflict[] = [];

    for (const path of paths) {
      const oursEntry = oursSnapshot.get(path);
      const theirsEntry = theirsSnapshot.get(path);
      const baseEntry = baseSnapshot.get(path);
      const oursChanged = oursEntry?.oid !== baseEntry?.oid;
      const theirsChanged = theirsEntry?.oid !== baseEntry?.oid;
      const differs = oursEntry?.oid !== theirsEntry?.oid;
      if (!oursChanged || !theirsChanged || !differs) continue;
      conflicts.push({
        path,
        ours: await this.readOptionalFileAtRef(ours, path),
        theirs: await this.readOptionalFileAtRef(theirs, path),
        base: await this.readOptionalFileAtRef(base, path)
      });
    }
    return conflicts;
  }

  private async writeConflictFiles(conflicts: StoredConflict[]): Promise<void> {
    await this.writeConflictState(conflicts);
    for (const conflict of conflicts) {
      await this.writeFile(conflict.path, `<<<<<<< HEAD\n${conflict.ours}=======\n${conflict.theirs}>>>>>>> MERGE_HEAD\n`);
    }
  }

  private conflictStateKey(): string {
    return `${this.namespace}:${this.dir}:omg-conflicts`;
  }

  private async readConflictState(): Promise<StoredConflict[]> {
    try {
      const raw = localStorage.getItem(this.conflictStateKey());
      if (raw) return JSON.parse(raw) as StoredConflict[];
    } catch {
      // ignore metadata read failures
    }
    try {
      return JSON.parse(await this.readFile('.omg-conflicts.json')) as StoredConflict[];
    } catch {
      return [];
    }
  }

  private async writeConflictState(conflicts: StoredConflict[]): Promise<void> {
    try {
      localStorage.setItem(this.conflictStateKey(), JSON.stringify(conflicts));
    } catch {
      // ignore metadata persistence failures
    }
  }

  private async clearConflictState(): Promise<void> {
    try {
      localStorage.removeItem(this.conflictStateKey());
    } catch {
      // ignore
    }
    try {
      await this.removeFile('.omg-conflicts.json');
    } catch {
      // legacy conflict state file may not exist
    }
  }

  private stashMetadataKey(): string {
    return `${this.namespace}:${this.dir}:omg-stashes`;
  }

  private async readStashMetadata(): Promise<Array<{ message: string; entries: Array<{ path: string; content: string }> }>> {
    try {
      const raw = localStorage.getItem(this.stashMetadataKey());
      return raw ? JSON.parse(raw) as Array<{ message: string; entries: Array<{ path: string; content: string }> }> : [];
    } catch {
      return [];
    }
  }

  private async writeStashMetadata(entries: Array<{ message: string; entries: Array<{ path: string; content: string }> }>): Promise<void> {
    try {
      localStorage.setItem(this.stashMetadataKey(), JSON.stringify(entries));
    } catch {
      // ignore metadata persistence failures
    }
  }

  private async clearStashMetadata(): Promise<void> {
    try {
      localStorage.removeItem(this.stashMetadataKey());
    } catch {
      // ignore
    }
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
