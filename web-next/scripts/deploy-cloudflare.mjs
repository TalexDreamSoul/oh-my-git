#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const secretFile = process.env.OH_MY_GIT_SECRETS_FILE || '.local/admin-secret.env';

function run(command, args) {
  console.log(`\n$ ${[command, ...args].join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit' });
}

if (!existsSync(secretFile)) {
  console.error(`Missing Cloudflare secrets file: ${secretFile}`);
  console.error('Create it locally with:');
  console.error(`  mkdir -p ${join(secretFile, '..')}`);
  console.error(`  printf 'ADMIN_SECRET=...' > ${secretFile}`);
  process.exit(1);
}

run('npx', ['opennextjs-cloudflare', 'build']);
run('npx', [
  'opennextjs-cloudflare',
  'deploy',
  '--',
  '--x-autoconfig',
  'false',
  '--keep-vars',
  '--secrets-file',
  secretFile,
]);
run('node', ['scripts/verify-deploy.mjs']);
