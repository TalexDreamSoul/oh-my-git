import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const levelsPath = path.join(root, 'app/game/levels.ts');
const levelIdsPath = path.join(root, 'app/game/levelIds.ts');
const recapsPath = path.join(root, 'app/game/chapterRecaps.ts');

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function parseSource(relativePath) {
  return ts.createSourceFile(relativePath, readSource(relativePath), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function literalValue(node, sourceFile) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((item) => literalValue(item, sourceFile));
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : property.name.getText(sourceFile);
      result[key] = literalValue(property.initializer, sourceFile);
    }
    return result;
  }
  return node.getText(sourceFile);
}

function unwrapArrayInitializer(node) {
  let current = node;
  while (current && (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current))) {
    current = current.expression;
  }
  return current && ts.isArrayLiteralExpression(current) ? current : null;
}

function findArrayExport(relativePath, name) {
  const sourceFile = parseSource(relativePath);
  let result = null;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      const arrayInitializer = unwrapArrayInitializer(node.initializer);
      if (arrayInitializer) result = arrayInitializer.elements.map((item) => literalValue(item, sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!result) throw new Error(`Cannot find array export ${name} in ${relativePath}`);
  return result;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function commandKnown(command) {
  if (/^(touch|echo|cat|ls|mkdir|rm|mv|clear|help)\b/.test(command)) return true;
  if (!command.startsWith('git ')) return false;
  const [, subcommand] = command.match(/^git\s+(\S+)/) ?? [];
  return ['add', 'apply', 'bisect', 'blame', 'branch', 'cat-file', 'checkout', 'cherry-pick', 'commit', 'config', 'diff', 'fetch', 'format-patch', 'ignore', 'init', 'log', 'merge', 'pull', 'push', 'rebase', 'recover', 'reflog', 'remote', 'reset', 'restore', 'rm', 'sparse-checkout', 'stash', 'status', 'submodule', 'switch', 'tag', 'worktree'].includes(subcommand);
}

function commandLooksRunnable(command) {
  if (command.includes('<hash>')) return false;
  return true;
}

const levels = findArrayExport('app/game/levels.ts', 'levels');
const validLevelIds = findArrayExport('app/game/levelIds.ts', 'VALID_LEVEL_IDS');
const recaps = findArrayExport('app/game/chapterRecaps.ts', 'CHAPTER_RECAPS');
const errors = [];
const warnings = [];

assert(levels.length >= 90, `Expected at least 90 levels, got ${levels.length}`, errors);
assert(new Set(levels.map((level) => level.id)).size === levels.length, 'Level ids must be unique', errors);
assert(JSON.stringify(levels.map((level) => level.id)) === JSON.stringify(validLevelIds), 'VALID_LEVEL_IDS must match levels order exactly', errors);

const chapters = [];
for (const level of levels) {
  if (!chapters.includes(level.chapter)) chapters.push(level.chapter);
}
assert(chapters.length >= 14, `Expected at least 14 chapters, got ${chapters.length}`, errors);
assert(recaps.length === chapters.length, `Expected ${chapters.length} chapter recaps, got ${recaps.length}`, errors);
for (const chapter of chapters) {
  assert(recaps.some((recap) => recap.chapter === chapter), `Missing recap for ${chapter}`, errors);
}

for (const level of levels) {
  assert(/^chapter-\d+-\d+-/.test(level.id), `${level.id}: id format should be chapter-N-NN-slug`, errors);
  assert(typeof level.summary === 'string' && level.summary.length >= 6, `${level.id}: summary is too short`, errors);
  assert(typeof level.description === 'string' && level.description.includes('背景') && level.description.includes('目标'), `${level.id}: description should include 背景 and 目标`, errors);
  assert([1, 2, 3].includes(level.difficulty), `${level.id}: invalid difficulty ${level.difficulty}`, errors);
  assert(Array.isArray(level.tutorial) && level.tutorial.length >= 3, `${level.id}: tutorial should contain at least 3 hints`, errors);
  assert(Array.isArray(level.commands) && level.commands.length >= 1, `${level.id}: commands should not be empty`, errors);
  assert(Array.isArray(level.setup) && level.setup.some((action) => action.type === 'gitInit'), `${level.id}: setup should initialize git`, errors);
  assert(Array.isArray(level.win) && level.win.length >= 1, `${level.id}: win conditions should not be empty`, errors);

  for (const command of level.commands ?? []) {
    assert(commandKnown(command), `${level.id}: unsupported sample command "${command}"`, errors);
    if (!commandLooksRunnable(command)) warnings.push(`${level.id}: sample command contains placeholder "${command}"`);
  }
}

for (const recap of recaps) {
  assert(typeof recap.theme === 'string' && recap.theme.length > 0, `${recap.chapter}: recap theme is required`, errors);
  assert(typeof recap.summary === 'string' && recap.summary.length >= 16, `${recap.chapter}: recap summary is too short`, errors);
  assert(Array.isArray(recap.lessons) && recap.lessons.length >= 3, `${recap.chapter}: recap needs at least 3 lessons`, errors);
  assert(typeof recap.practice === 'string' && recap.practice.length >= 12, `${recap.chapter}: recap practice is too short`, errors);
  assert(typeof recap.next === 'string' && recap.next.length >= 8, `${recap.chapter}: recap next is too short`, errors);
}

if (warnings.length > 0) {
  console.warn(`Level QA warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error(`Level QA failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Level QA passed: ${levels.length} levels, ${chapters.length} chapters, ${recaps.length} recaps.`);
