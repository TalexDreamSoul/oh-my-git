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
  'app/game/scoring.ts',
  'app/game/activeTimer.ts',
  'app/game/levelHints.ts',
  'app/game/aiCoach.ts',
  'app/game/shell.ts',
  'app/game/localShell.ts',
  'app/lib/achievements.ts',
  'app/lib/progress.ts',
  'app/lib/request.ts',
  'app/lib/kv.ts',
  'app/lib/seasons.ts',
  'app/api/achievements/route.ts',
  'app/api/leaderboard/route.ts',
  'app/api/progress/route.ts',
  'app/api/progress/sync/route.ts',
  'app/api/save/route.ts',
  'app/api/season/leaderboard/route.ts'
];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeQaNextHeadersStub(buildDir) {
  const stubPath = path.join(buildDir, 'app/lib/node_modules/next/headers.js');
  await fs.mkdir(path.dirname(stubPath), { recursive: true });
  await fs.writeFile(stubPath, `
function cookieMap() {
  if (!globalThis.__omgQaCookies) globalThis.__omgQaCookies = new Map();
  return globalThis.__omgQaCookies;
}

exports.cookies = async function cookies() {
  return {
    get(name) {
      const value = cookieMap().get(name);
      return value == null ? undefined : { name, value };
    },
    set(name, value) {
      cookieMap().set(name, value);
    },
    delete(name) {
      cookieMap().delete(name);
    }
  };
};

exports.headers = async function headers() {
  return new Map();
};

exports.draftMode = async function draftMode() {
  return { isEnabled: false, enable() {}, disable() {} };
};
`);
}

async function compileQaModules() {
  const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omg-web-next-contracts-build-'));
  const nodeModulesPath = path.join(root, 'node_modules');
  if (await pathExists(nodeModulesPath)) {
    await fs.symlink(nodeModulesPath, path.join(buildDir, 'node_modules'), 'dir');
    await writeQaNextHeadersStub(buildDir);
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

async function testMkdirListsEmptyDirectories(modules) {
  const { git, repoRoot } = await makeRepo(modules, 'mkdir-empty-dir');
  try {
    await git.init();

    const mkdirResult = await modules.runCommand(git, 'mkdir child');
    assert.equal(mkdirResult.success, true, mkdirResult.output);
    assert.equal((await git.listWorkingFiles()).includes('child/'), true, 'empty directories must appear with a trailing slash');

    const touchNestedResult = await modules.runCommand(git, 'touch child/app.js');
    assert.equal(touchNestedResult.success, true, touchNestedResult.output);
    const nestedFiles = await git.listWorkingFiles();
    assert.equal(nestedFiles.includes('child/'), false, 'directory entries must disappear once they contain visible files');
    assert.equal(nestedFiles.includes('child/app.js'), true, 'nested files must remain visible after replacing the empty directory entry');

    const touchPlainResult = await modules.runCommand(git, 'touch plain.txt');
    assert.equal(touchPlainResult.success, true, touchPlainResult.output);
    let mkdirExistingFileSucceeded = false;
    try {
      const mkdirExistingFileResult = await modules.runCommand(git, 'mkdir plain.txt');
      mkdirExistingFileSucceeded = mkdirExistingFileResult.success === true;
    } catch {
      mkdirExistingFileSucceeded = false;
    }
    assert.equal(mkdirExistingFileSucceeded, false, 'mkdir plain.txt must fail when plain.txt is already a file');
    console.log('✓ mkdir surfaces empty dirs and rejects existing files');
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
}

async function testLocalShellSubdirectoryNavigation(modules) {
  const { git, repoRoot } = await makeRepo(modules, 'local-shell-cwd');
  try {
    await git.init();
    const shell = new modules.LocalShell(git, 'player');

    let result = await shell.execute('mkdir child');
    assert.equal(result.success, true, result.output);
    result = await shell.execute('ls');
    assert.equal(result.success, true, result.output);
    assert.match(result.output, /child\//, 'ls at repo root should show empty child directory');

    result = await shell.execute('cd child');
    assert.equal(result.success, true, result.output);
    assert.equal(result.cwd, '/child');
    result = await shell.execute('touch app.js');
    assert.equal(result.success, true, result.output);
    assert.equal((await git.listWorkingFiles()).includes('child/app.js'), true, 'touch in a subdirectory must create a nested repo path');

    result = await shell.execute('ls');
    assert.equal(result.success, true, result.output);
    assert.match(result.output, /app\.js/, 'ls in child directory should show nested file');
    assert.doesNotMatch(result.output, /child\//, 'ls in child directory should not repeat the current directory');
    console.log('✓ local shell can cd into mkdir-created dirs');
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

function testLevelScoreContracts(modules) {
  assert.equal(modules.calculateLevelScore({ difficulty: 1, elapsedSeconds: 30, pureCli: true }), 100, 'easy levels should allow 30 seconds for a perfect CLI score');
  assert.equal(modules.calculateLevelScore({ difficulty: 1, elapsedSeconds: 31, pureCli: true }), 95, 'easy levels should lose the first time bucket after 30 seconds');
  assert.equal(modules.calculateLevelScore({ difficulty: 2, elapsedSeconds: 90, pureCli: true }), 100, 'medium levels should allow 90 seconds for a perfect CLI score');
  assert.equal(modules.calculateLevelScore({ difficulty: 2, elapsedSeconds: 91, pureCli: true }), 95, 'medium levels should lose the first time bucket after 90 seconds');
  assert.equal(modules.calculateLevelScore({ difficulty: 3, elapsedSeconds: 180, pureCli: true }), 100, 'hard levels should allow 180 seconds for a perfect CLI score');
  assert.equal(modules.calculateLevelScore({ difficulty: 3, elapsedSeconds: 181, pureCli: true }), 95, 'hard levels should lose the first time bucket after 180 seconds');
  assert.equal(modules.calculateLevelScore({ difficulty: 3, elapsedSeconds: 180, pureCli: false }), 90, 'assisted operations should keep the existing 10 point penalty');
  assert.equal(modules.calculateLevelScore({ difficulty: 3, elapsedSeconds: 1000, pureCli: false }), 60, 'score floor should remain 60');
  console.log('✓ difficulty-aware scoring gives complex levels a realistic perfect window');
}

function testActiveGameplayTimerContracts(modules) {
  const maxActiveTickMs = 2_000;
  let state = modules.createActiveTimerState(1_000, modules.isActiveGameplayTime('visible', true));

  state = modules.advanceActiveTimer(state, 1_750, modules.isActiveGameplayTime('visible', true), { maxActiveTickMs });
  assert.equal(state.activeElapsedMs, 750, 'visible focused play should count the first active delta');

  state = modules.advanceActiveTimer(state, 2_500, modules.isActiveGameplayTime('visible', true), { maxActiveTickMs });
  assert.equal(state.activeElapsedMs, 1_500, 'visible focused play should accumulate consecutive active deltas');

  state = modules.advanceActiveTimer(state, 2_600, modules.isActiveGameplayTime('hidden', true), { maxActiveTickMs });
  assert.equal(state.activeElapsedMs, 1_600, 'the final visible interval before hiding should still count');

  state = modules.advanceActiveTimer(state, 62_600, modules.isActiveGameplayTime('hidden', true), { maxActiveTickMs });
  assert.equal(state.activeElapsedMs, 1_600, 'hidden tab time must not inflate elapsed level time');

  state = modules.advanceActiveTimer(state, 63_100, modules.isActiveGameplayTime('visible', false), { maxActiveTickMs });
  assert.equal(state.activeElapsedMs, 1_600, 'blurred window time must not inflate elapsed level time');

  state = modules.advanceActiveTimer(state, 63_200, modules.isActiveGameplayTime('visible', true), { maxActiveTickMs });
  assert.equal(state.activeElapsedMs, 1_600, 'returning to active play should not count the prior inactive gap');

  state = modules.advanceActiveTimer(state, 123_200, modules.isActiveGameplayTime('visible', true), { maxActiveTickMs });
  assert.equal(state.activeElapsedMs, 3_600, 'a delayed active tick should be capped instead of adding the full sleep gap');
  assert.equal(modules.activeElapsedSeconds(state), 3, 'elapsed seconds should floor accumulated active milliseconds');
  console.log('✓ active gameplay timer counts only visible focused play time');
}

function installQaKv(initial = {}) {
  const store = new Map(Object.entries(initial).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  globalThis.__omgQaCookies = new Map([['omg_session', 'qa-session']]);
  globalThis[Symbol.for('__cloudflare-context__')] = {
    env: {
      KV: {
        async get(key) {
          return store.get(key) ?? null;
        },
        async put(key, value) {
          store.set(key, value);
        },
        async delete(key) {
          store.delete(key);
        },
        async list(options = {}) {
          const prefix = options.prefix ?? '';
          return { keys: [...store.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
        }
      }
    }
  };
  return {
    store,
    read(key) {
      const value = store.get(key);
      return value == null ? null : JSON.parse(value);
    }
  };
}

function qaUser() {
  return {
    id: 'usr_contract',
    provider: 'qa',
    provider_user_id: 'contract',
    name: 'Contract Player',
    avatar_url: null,
    leaderboard_anonymous: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  };
}

function qaSession(userId = 'usr_contract') {
  return {
    token: 'qa-session',
    user_id: userId,
    expires_at: Date.now() + 60_000,
    created_at: '2026-01-01T00:00:00.000Z'
  };
}

function jsonRequest(url, body) {
  return new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function assertRejectsContract(responseOrPromise, expectedStatus, message) {
  const response = await Promise.resolve(responseOrPromise).catch((error) => {
    if (error instanceof Response) return error;
    if (error?.name === 'ZodError') return Response.json({ error: 'Invalid payload.' }, { status: 400 });
    throw error;
  });
  assert.equal(response.status, expectedStatus, message);
  return response;
}

async function testSaveRouteRejectsOversizedAndUnknownPayload(modules) {
  const kvHarness = installQaKv({
    'session:qa-session': qaSession(),
    'user:usr_contract': qaUser()
  });
  const validPayload = { version: 1, currentLevelId: 'chapter-1-01-create-readme', settings: { theme: 'dark', soundEnabled: true, terminalHeight: 320 } };

  const validResponse = await modules.savePut(jsonRequest('https://qa.test/api/save', { payload: validPayload }));
  assert.equal(validResponse.status, 200, 'valid save payload should be accepted');
  assert.deepEqual(kvHarness.read('save:usr_contract').payload, validPayload, 'accepted save payload should be persisted exactly as the cloud-save contract');

  const previous = kvHarness.store.get('save:usr_contract');
  await assertRejectsContract(modules.savePut(jsonRequest('https://qa.test/api/save', {
    payload: validPayload,
    padding: 'x'.repeat(300_000)
  })), 413, 'oversized save request bodies must be rejected before persistence');
  assert.equal(kvHarness.store.get('save:usr_contract'), previous, 'rejected oversized save must not overwrite the prior valid save');

  await assertRejectsContract(modules.savePut(jsonRequest('https://qa.test/api/save', {
    payload: { ...validPayload, solvedLevelIds: ['chapter-1-01-create-readme'], leaderboard: [{ user_id: 'attacker', score: 100 }] }
  })), 400, 'save payload must reject fields outside the cloud-save whitelist');
  assert.equal(kvHarness.store.get('save:usr_contract'), previous, 'rejected unknown save fields must not be persisted');
  console.log('✓ save API rejects oversized payloads and non-whitelisted fields');
}

async function testProgressTamperingDoesNotEnterLeaderboards(modules) {
  const kvHarness = installQaKv({
    'session:qa-session': qaSession(),
    'user:usr_contract': qaUser()
  });
  const levelId = 'chapter-1-01-create-readme';
  const response = await modules.progressPost(jsonRequest('https://qa.test/api/progress', {
    levelId,
    solved: true,
    score: 100,
    timeSeconds: 0,
    pureCli: true
  }));

  assert.equal(response.status, 200, 'progress completion should still record local progress for the authenticated user');
  const progress = kvHarness.read('progress:usr_contract');
  assert.equal(progress?.[0]?.level_id, levelId, 'accepted progress row should identify the completed level');
  assert.equal(progress?.[0]?.verified, 0, 'client-submitted score must not mark progress as verified');
  assert.equal(kvHarness.read('leaderboard:s2026-spring:chapter-1-01-create-readme'), null, 'client-submitted score must not directly enter the per-level leaderboard');
  assert.equal(kvHarness.read('season-leaderboard:s2026-spring'), null, 'client-submitted score must not directly enter the season leaderboard');
  console.log('✓ progress API records tampered completions without trusting them for leaderboards');
}

async function testProgressSyncImportDoesNotEnterLeaderboards(modules) {
  const kvHarness = installQaKv({
    'session:qa-session': qaSession(),
    'user:usr_contract': qaUser()
  });
  const levelId = 'chapter-1-01-create-readme';
  const response = await modules.progressSyncPost(jsonRequest('https://qa.test/api/progress/sync', { solvedLevelIds: [levelId] }));

  assert.equal(response.status, 200, 'sync import should merge valid solved level ids');
  const progress = kvHarness.read('progress:usr_contract');
  assert.equal(progress?.[0]?.level_id, levelId, 'sync import should persist the solved level row');
  assert.equal(progress?.[0]?.best_score, null, 'sync import must not synthesize a verified score');
  assert.equal(progress?.[0]?.verified, 0, 'sync import must not mark progress as verified');
  assert.equal(kvHarness.read('leaderboard:s2026-spring:chapter-1-01-create-readme'), null, 'sync-imported completion must not enter the per-level leaderboard');
  assert.equal(kvHarness.read('season-leaderboard:s2026-spring'), null, 'sync-imported completion must not enter the season leaderboard');
  console.log('✓ progress sync imports solved ids without verified leaderboard credit');
}

async function main() {
  const buildDir = await compileQaModules();
  try {
    const require = createRequire(path.join(buildDir, 'qa-contracts.cjs'));
    const levelsModule = require(path.join(buildDir, 'app/game/levels.js'));
    const shellModule = require(path.join(buildDir, 'app/game/shell.js'));
    const localShellModule = require(path.join(buildDir, 'app/game/localShell.js'));
    const aiCoachModule = require(path.join(buildDir, 'app/game/aiCoach.js'));
    const gitModule = require(path.join(buildDir, 'app/git/browserGit.js'));
    const fsModule = require(path.join(buildDir, 'app/git/nodeFsAdapter.js'));
    const achievementsModule = require(path.join(buildDir, 'app/lib/achievements.js'));
    const scoringModule = require(path.join(buildDir, 'app/game/scoring.js'));
    const activeTimerModule = require(path.join(buildDir, 'app/game/activeTimer.js'));
    const progressRoute = require(path.join(buildDir, 'app/api/progress/route.js'));
    const progressSyncRoute = require(path.join(buildDir, 'app/api/progress/sync/route.js'));
    const saveRoute = require(path.join(buildDir, 'app/api/save/route.js'));
    const modules = {
      levels: levelsModule.levels,
      runAction: levelsModule.runAction,
      checkWin: levelsModule.checkWin,
      runCommand: shellModule.runCommand,
      LocalShell: localShellModule.LocalShell,
      buildLocalAiHint: aiCoachModule.buildLocalAiHint,
      BrowserGit: gitModule.BrowserGit,
      createNodeFsAdapter: fsModule.createNodeFsAdapter,
      achievements: achievementsModule.achievements,
      achievementProgressById: achievementsModule.achievementProgressById,
      evaluateAchievements: achievementsModule.evaluateAchievements,
      normalizeUserAchievements: achievementsModule.normalizeUserAchievements,
      calculateLevelScore: scoringModule.calculateLevelScore,
      createActiveTimerState: activeTimerModule.createActiveTimerState,
      advanceActiveTimer: activeTimerModule.advanceActiveTimer,
      activeElapsedSeconds: activeTimerModule.activeElapsedSeconds,
      isActiveGameplayTime: activeTimerModule.isActiveGameplayTime,
      progressPost: progressRoute.POST,
      progressSyncPost: progressSyncRoute.POST,
      savePut: saveRoute.PUT
    };

    await testTouchPreservesExistingContent(modules);
    await testMkdirListsEmptyDirectories(modules);
    await testLocalShellSubdirectoryNavigation(modules);
    await testFeatureWorkSampleCommandsWin(modules);
    testAiCoachFallback(modules);
    testAchievementEvaluationContracts(modules);
    testLevelScoreContracts(modules);
    testActiveGameplayTimerContracts(modules);
    await testSaveRouteRejectsOversizedAndUnknownPayload(modules);
    await testProgressTamperingDoesNotEnterLeaderboards(modules);
    await testProgressSyncImportDoesNotEnterLeaderboards(modules);
    console.log('Behavior QA passed.');
  } finally {
    await fs.rm(buildDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
