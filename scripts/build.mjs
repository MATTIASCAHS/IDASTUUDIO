import { spawnSync } from 'node:child_process';
import { access, cp } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const customDir = path.join(rootDir, 'custom');

const skipClone = process.argv.includes('--skipClone');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function ensurePathExists(targetPath, hint) {
  try {
    await access(targetPath);
  } catch {
    console.error(hint);
    process.exit(1);
  }
}

if (!skipClone) {
  run('bash', ['scripts/clone.sh']);
}

await ensurePathExists(publicDir, 'Missing public/ directory. Run a full build without --skipClone first.');
await ensurePathExists(customDir, 'Missing custom/ directory. Cannot overlay custom pages.');

await cp(customDir, publicDir, { recursive: true, force: true });
run('node', ['scripts/patch-nav.mjs']);

console.log('Build complete: cloned site + custom overlay available in public/.');
