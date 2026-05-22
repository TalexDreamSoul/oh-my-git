import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = process.cwd();
const buildDir = path.join(root, '.qa-build');
const forceBuild = process.argv.includes('--rebuild') || process.env.QA_REBUILD === '1';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function buildQaBundle() {
  await fs.rm(buildDir, { recursive: true, force: true });
  await run('npx', [
    'esbuild',
    'app/git/browserGit.ts',
    'app/game/levels.ts',
    'app/game/shell.ts',
    'app/git/nodeFsAdapter.ts',
    '--bundle',
    '--platform=node',
    '--format=cjs',
    '--outdir=.qa-build',
    '--out-extension:.js=.cjs',
    '--external:@isomorphic-git/lightning-fs',
    '--log-level=warning'
  ]);
}

function sanitizeCommands(commands) {
  return commands.filter((command) => {
    if (command === 'git status' || command === 'git log' || command === 'git branch' || command === 'git tag' || command === 'git remote -v' || command === 'git reflog') return false;
    if (command.startsWith('cat ') || command === 'ls') return false;
    return true;
  });
}

async function loadQaModules() {
  const levelsModule = await import(pathToFileURL(path.join(buildDir, 'game/levels.cjs')).href);
  const shellModule = await import(pathToFileURL(path.join(buildDir, 'game/shell.cjs')).href);
  const gitModule = await import(pathToFileURL(path.join(buildDir, 'git/browserGit.cjs')).href);
  const fsModule = await import(pathToFileURL(path.join(buildDir, 'git/nodeFsAdapter.cjs')).href);
  return {
    levels: levelsModule.levels,
    runAction: levelsModule.runAction,
    checkWin: levelsModule.checkWin,
    runCommand: shellModule.runCommand,
    BrowserGit: gitModule.BrowserGit,
    createNodeFsAdapter: fsModule.createNodeFsAdapter
  };
}

async function runLevelQa(level, modules, options) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), `omg-level-${level.id}-`));
  const git = new modules.BrowserGit(`qa:${level.id}`, repoRoot, { fs: modules.createNodeFsAdapter(), useLocalStorageMetadata: false });
  const commands = sanitizeCommands(level.commands);
  const outputs = [];
  try {
    await git.resetStorage();
    for (const action of level.setup) await modules.runAction(git, action);
    for (const command of commands) {
      const result = await modules.runCommand(git, command);
      outputs.push({ command, success: result.success, output: result.output });
      const expectedNonZero = (command.startsWith('git merge ') || command.startsWith('git rebase ')) && result.output.includes('CONFLICT');
      if (!result.success && !expectedNonZero && !options.allowCommandFailures) {
        return { ok: false, level, commands, outputs, reason: `command failed: ${command}`, repoRoot };
      }
    }
    const won = await modules.checkWin(git, level.win);
    if (!won) return { ok: false, level, commands, outputs, reason: 'win condition not satisfied', repoRoot };
    await fs.rm(repoRoot, { recursive: true, force: true });
    return { ok: true, level, commands, outputs };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return { ok: false, level, commands, outputs, reason, stack, repoRoot };
  }
}

function parseArgs(argv) {
  const options = {
    keepFailedRepos: false,
    allowCommandFailures: false,
    levelFilter: ''
  };
  for (const arg of argv) {
    if (arg === '--keep-failed-repos') options.keepFailedRepos = true;
    else if (arg === '--allow-command-failures') options.allowCommandFailures = true;
    else if (arg.startsWith('--level=')) options.levelFilter = arg.slice('--level='.length);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (forceBuild) await buildQaBundle();
else {
  try {
    await fs.access(path.join(buildDir, 'game/levels.cjs'));
  } catch {
    await buildQaBundle();
  }
}
const modules = await loadQaModules();
const targetLevels = options.levelFilter ? modules.levels.filter((level) => level.id.includes(options.levelFilter)) : modules.levels;
const failures = [];

for (const [index, level] of targetLevels.entries()) {
  const result = await runLevelQa(level, modules, options);
  if (result.ok) {
    console.log(`✓ ${String(index + 1).padStart(2, '0')}/${targetLevels.length} ${level.id}`);
  } else {
    failures.push(result);
    console.error(`✗ ${String(index + 1).padStart(2, '0')}/${targetLevels.length} ${level.id}: ${result.reason}`);
    for (const item of result.outputs.slice(-6)) {
      console.error(`  $ ${item.command} ${item.success ? '' : '(failed)'}`.trimEnd());
      if (item.output) console.error(item.output.split('\n').slice(0, 6).map((line) => `    ${line}`).join('\n'));
    }
    if (result.stack && options.keepFailedRepos) console.error(result.stack.split('\n').slice(0, 8).map((line) => `  ${line}`).join('\n'));
    if (!options.keepFailedRepos && result.repoRoot) await fs.rm(result.repoRoot, { recursive: true, force: true }).catch(() => undefined);
    else if (result.repoRoot) console.error(`  repo kept at ${result.repoRoot}`);
  }
}

if (failures.length > 0) {
  console.error(`Level command QA failed: ${failures.length}/${targetLevels.length}`);
  process.exit(1);
}

console.log(`Level command QA passed: ${targetLevels.length} levels.`);
