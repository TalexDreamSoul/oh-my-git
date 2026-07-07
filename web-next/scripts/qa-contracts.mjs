import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = process.cwd();
const sourceFiles = [
  'app/git/browserGit.ts',
  'app/git/nodeFsAdapter.ts',
  'app/game/levelIds.ts',
  'app/game/levels.ts',
  'app/game/levelHints.ts',
  'app/game/aiCoach.ts',
  'app/game/shell.ts',
  'app/lib/achievements.ts'
];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function compileQaModules() {
  const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omg-web-next-contracts-build-'));
  const nodeModulesPath = path.join(root, 'node_modules');
  if (await pathExists(nodeModulesPath)) {
    await fs.symlink(nodeModulesPath, path.join(buildDir, 'node_modules'), 'dir');
  }

  await Promise.all(sourceFiles.map(async (relativePath) => {
    const sourcePath = path.join(root, relativePath);
    const source = await fs.readFile(sourcePath, 'utf8');
    const output = ts.transpileModule(source, {
      fileName: sourcePath,
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const outputPath = path.join(buildDir, relativePath.replace(/\.ts$/, '.js'));
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, output);
  }));

  return buildDir;
}

async function makeRepo(modules, label) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), `omg-web-next-${label}-`));
  const git = new modules.BrowserGit(`qa:${label}`, repoRoot, {
    fs: modules.createNodeFsAdapter(),
    useLocalStorageMetadata: false
  });
  await git.resetStorage();
  return { git, repoRoot };
}

async function testTouchPreservesExistingContent(modules) {
  const { git, repoRoot } = await makeRepo(modules, 'touch-preserve');
  try {
    const existing = 'console.log("keep me");\nexport const answer = 42;\n';
    await git.writeFile('src/app.js', existing);

    const result = await modules.runCommand(git, 'touch src/app.js');

    assert.equal(result.success, true, result.output);
    assert.equal(await git.readFile('src/app.js'), existing, 'touch must not truncate an existing file');
    console.log('✓ touch src/app.js preserves existing file content');
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
}

async function testFeatureWorkSampleCommandsWin(modules) {
  const level = modules.levels.find((item) => item.id === 'chapter-1-09-feature-work');
  assert.ok(level, 'chapter-1-09-feature-work level must exist');

  const { git, repoRoot } = await makeRepo(modules, 'feature-work');
  try {
    for (const action of level.setup) await modules.runAction(git, action);

    const outputs = [];
    for (const command of level.commands) {
      const result = await modules.runCommand(git, command);
      outputs.push({ command, ...result });
      assert.equal(result.success, true, `sample command failed: ${command}\n${result.output}`);
    }

    assert.equal(await modules.checkWin(git, level.win), true, `sample commands did not satisfy win conditions: ${JSON.stringify(outputs)}`);
    console.log('✓ chapter-1-09-feature-work sample commands satisfy win conditions');
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
}

function testAiCoachFallback(modules) {
  const level = modules.levels.find((item) => item.id === 'chapter-1-09-feature-work');
  assert.ok(level, 'chapter-1-09-feature-work level must exist');

  const hint = modules.buildLocalAiHint(level, ['当前分支为 feature']);

  assert.equal(hint.ok, true, 'fallback AI coach hint must succeed locally');
  assert.equal(hint.status, 'fallback', 'fallback AI coach hint must disclose local fallback status');
  assert.equal(hint.source, 'local-hints', 'fallback AI coach hint must not pretend to be provider output');
  assert.match(hint.hint, /下一步建议/, 'fallback AI coach hint must be player-facing');
  assert.match(hint.hint, /还剩 2 个目标未完成/, 'fallback AI coach hint must account for completed conditions');
  console.log('✓ AI coach local fallback returns bounded player-facing hint');
}

function testAchievementEvaluationContracts(modules) {
  const chapterOneIds = [
    'chapter-1-01-create-readme',
    'chapter-1-02-write-readme',
    'chapter-1-03-stage-readme',
    'chapter-1-04-first-commit',
    'chapter-1-05-change-readme',
    'chapter-1-06-second-commit',
    'chapter-1-07-create-branch',
    'chapter-1-08-checkout-branch',
    'chapter-1-09-feature-work',
    'chapter-1-10-clean-temp'
  ];
  const progress = chapterOneIds.map((levelId, index) => ({
    level_id: levelId,
    solved: true,
    pure_cli: index === 1,
    best_time_seconds: index === 2 ? 42 : null
  }));
  progress.push({
    level_id: 'chapter-1-04-first-commit',
    solved: 1,
    pure_cli: 1,
    best_time_seconds: 30
  });

  const firstPass = modules.evaluateAchievements(progress);
  const secondPass = modules.evaluateAchievements(progress);
  const expected = ['first_level', 'first_commit', 'pure_cli_first', 'speed_runner', 'chapter_one_clear'];
  const normalized = modules.normalizeUserAchievements([
    { id: 'first_level', unlocked_at: '2026-01-01T00:00:00.000Z' },
    { id: 'first_level', unlocked_at: '2026-01-02T00:00:00.000Z' },
    { id: 'chapter_one_clear' }
  ], '2026-01-03T00:00:00.000Z');
  const chapterProgress = modules.achievementProgressById('chapter_one_clear', progress);

  assert.deepEqual(secondPass, firstPass, 'achievement evaluation must be deterministic for identical progress');
  assert.deepEqual([...new Set(firstPass)], firstPass, 'achievement ids must be unique even when progress contains duplicate solved rows');
  assert.deepEqual([...firstPass].sort(), [...expected].sort(), 'representative chapter-one progress should unlock only first/chapter/pure/speed achievements');
  assert.deepEqual(normalized.map((item) => item.id), ['first_level', 'chapter_one_clear'], 'stored achievement rows must be deduplicated by id');
  assert.equal(normalized[1].unlocked_at, '2026-01-03T00:00:00.000Z', 'legacy achievement rows without timestamps must remain readable');
  assert.deepEqual(chapterProgress, { current: 10, target: 10, unlocked: true }, 'achievement progress must expose earned/locked medal state from the same rules');
  assert.ok(modules.achievements.every((item) => item.category && item.target > 0), 'achievement definitions must expose medal metadata');
  console.log('✓ achievement evaluation unlocks first/chapter/pure/speed achievements without duplicate ids');
}

async function main() {
  const buildDir = await compileQaModules();
  try {
    const require = createRequire(path.join(buildDir, 'qa-contracts.cjs'));
    const levelsModule = require(path.join(buildDir, 'app/game/levels.js'));
    const shellModule = require(path.join(buildDir, 'app/game/shell.js'));
    const aiCoachModule = require(path.join(buildDir, 'app/game/aiCoach.js'));
    const gitModule = require(path.join(buildDir, 'app/git/browserGit.js'));
    const fsModule = require(path.join(buildDir, 'app/git/nodeFsAdapter.js'));
    const achievementsModule = require(path.join(buildDir, 'app/lib/achievements.js'));
    const modules = {
      levels: levelsModule.levels,
      runAction: levelsModule.runAction,
      checkWin: levelsModule.checkWin,
      runCommand: shellModule.runCommand,
      buildLocalAiHint: aiCoachModule.buildLocalAiHint,
      BrowserGit: gitModule.BrowserGit,
      createNodeFsAdapter: fsModule.createNodeFsAdapter,
      achievements: achievementsModule.achievements,
      achievementProgressById: achievementsModule.achievementProgressById,
      evaluateAchievements: achievementsModule.evaluateAchievements,
      normalizeUserAchievements: achievementsModule.normalizeUserAchievements
    };

    await testTouchPreservesExistingContent(modules);
    await testFeatureWorkSampleCommandsWin(modules);
    testAiCoachFallback(modules);
    testAchievementEvaluationContracts(modules);
    console.log('Behavior QA passed.');
  } finally {
    await fs.rm(buildDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
