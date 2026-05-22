import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export type NodeFsAdapter = typeof fs & {
  promises: {
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    readFile(path: string, options?: { encoding?: BufferEncoding }): Promise<string | Buffer>;
    readdir(path: string): Promise<string[]>;
    rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    rmdir(path: string): Promise<void>;
    stat(path: string): Promise<unknown>;
    lstat(path: string): Promise<unknown>;
    readlink(path: string): Promise<string>;
    symlink(target: string, path: string): Promise<void>;
    unlink(path: string): Promise<void>;
  };
};

export function createNodeFsAdapter(): NodeFsAdapter {
  const adapter = {
    ...fs,
    mkdir: fs.mkdir,
    writeFile: fs.writeFile,
    readFile: fs.readFile,
    readdir: fs.readdir,
    rm: fs.rm,
    rmdir: fs.rmdir,
    stat: fs.stat,
    lstat: fs.lstat,
    readlink: fs.readlink,
    symlink: fs.symlink,
    unlink: fs.unlink,
    rename: async (oldPath: string, newPath: string) => {
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      await fs.rename(oldPath, newPath);
    },
    promises: Object.defineProperty({
      mkdir: async (targetPath: string, options?: { recursive?: boolean }) => {
        await fs.mkdir(targetPath, options);
      },
      writeFile: async (targetPath: string, data: string | Uint8Array) => {
        await fs.writeFile(targetPath, data);
      },
      readFile: (targetPath: string, options?: { encoding?: BufferEncoding }) => fs.readFile(targetPath, options),
      readdir: (targetPath: string) => fs.readdir(targetPath),
      rm: async (targetPath: string, options?: { recursive?: boolean; force?: boolean }) => {
        await fs.rm(targetPath, options);
      },
      rename: async (oldPath: string, newPath: string) => {
        await fs.mkdir(path.dirname(newPath), { recursive: true });
        await fs.rename(oldPath, newPath);
      },
      rmdir: fs.rmdir,
      stat: fs.stat,
      lstat: fs.lstat,
      readlink: fs.readlink,
      symlink: fs.symlink,
      unlink: (targetPath: string) => fs.unlink(targetPath)
    }, '_original_unwrapped_fs', { value: true })
  };
  return adapter as NodeFsAdapter;
}
