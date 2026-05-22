#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const WORKER_NAME = 'oh-my-git-web-next';
const BASE_URL = process.env.OH_MY_GIT_DEPLOY_URL || 'https://oh-my-git-web-next.talexdreamsoul.workers.dev';
const REQUIRED_BINDINGS = ['ADMIN_SECRET', 'ASSETS', 'KV'];

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  }
  catch {
    throw new Error(`${path} returned non-JSON response: ${text.slice(0, 160)}`);
  }
  return { response, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function currentVersionId(deployment) {
  const versions = Array.isArray(deployment?.versions) ? deployment.versions : [];
  const active = versions.find((item) => Number(item.percentage) === 100) || versions[0];
  return active?.version_id || active?.id || '';
}

async function main() {
  const deployment = JSON.parse(run('npx', ['wrangler', 'deployments', 'status', '--name', WORKER_NAME, '--json']));
  const versionId = currentVersionId(deployment);
  assert(versionId, 'Unable to resolve current Worker version id.');

  const version = JSON.parse(run('npx', ['wrangler', 'versions', 'view', versionId, '--name', WORKER_NAME, '--json']));
  const handlers = version?.resources?.script?.handlers || [];
  const bindings = version?.resources?.bindings || [];
  const bindingNames = bindings.map((item) => item.name).filter(Boolean);

  assert(handlers.includes('fetch'), `Current version ${versionId} has no fetch handler.`);
  for (const name of REQUIRED_BINDINGS) {
    assert(bindingNames.includes(name), `Current version ${versionId} is missing binding ${name}.`);
  }

  const health = await fetchJson('/api/health');
  assert(health.response.ok && health.json?.ok === true, `/api/health failed with HTTP ${health.response.status}.`);

  const admin = await fetchJson('/api/admin/login');
  assert(admin.response.ok && admin.json?.secretConfigured === true, `/api/admin/login reports ADMIN_SECRET is not configured.`);

  console.log(`Deploy verified: ${WORKER_NAME}@${versionId}`);
}

main().catch((error) => {
  console.error(`Deploy verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
