import { BrowserGit } from '../git/browserGit';

export type Card = {
  id: string;
  label: string;
  description: string;
  play(git: BrowserGit): Promise<void>;
};

export const cards: Record<string, Card> = {
  'file-new': {
    id: 'file-new',
    label: 'touch note.txt',
    description: '创建一个示例文件。',
    async play(git) {
      await git.writeFile(`note-${Date.now().toString(36)}.txt`, 'A new file.\n');
    }
  },
  add: {
    id: 'add',
    label: 'git add .',
    description: '把当前文件加入暂存区。',
    async play(git) {
      await git.add('.');
    }
  },
  commit: {
    id: 'commit',
    label: 'git commit',
    description: '创建一次提交。',
    async play(git) {
      await git.commit(`Commit ${new Date().toLocaleTimeString()}`);
    }
  }
};
