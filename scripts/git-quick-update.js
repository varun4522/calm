#!/usr/bin/env node
// Cross-platform quick git update: stage all, commit with timestamp, push to current branch
const { execSync } = require('child_process');

function run(cmd, options = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...options }).trim();
}

function log(msg) {
  // Simple prefixed log for clarity
  console.log(`[quick-git] ${msg}`);
}

try {
  // Ensure we're in a git repo
  run('git rev-parse --is-inside-work-tree');

  // Resolve current branch
  const branch = run('git rev-parse --abbrev-ref HEAD');
  log(`Current branch: ${branch}`);

  // Ensure remote exists
  let originUrl = '';
  try {
    originUrl = run('git remote get-url origin');
  } catch (_) {
    console.error('[quick-git] No remote named "origin" is configured. Please set it first.');
    process.exit(1);
  }
  log(`Remote origin: ${originUrl}`);

  // Check working tree changes
  const status = run('git status --porcelain');
  if (status.length === 0) {
    log('No local changes to commit. Pushing latest branch state...');
    // Still attempt push to sync
    execSync('git push', { stdio: 'inherit' });
    process.exit(0);
  }

  // Stage all
  log('Staging all changes...');
  execSync('git add -A', { stdio: 'inherit' });

  // Generate commit message with timestamp
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const message = process.env.QUICK_GIT_MESSAGE || `chore: quick update ${ts}`;

  // Commit (if nothing to commit, git will exit non-zero; handle gracefully)
  try {
    log(`Committing with message: "${message}"`);
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  } catch (e) {
    // If there were no staged changes (race), continue to push
    log('Nothing to commit after staging. Continuing to push...');
  }

  // Push to the upstream (assumes upstream is set); fallback to origin current branch
  try {
    log('Pushing to upstream...');
    execSync('git push', { stdio: 'inherit' });
  } catch (e) {
    log('No upstream configured. Pushing to origin explicitly...');
    execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });
  }

  log('Done.');
} catch (err) {
  console.error('[quick-git] Failed:', err.message || err);
  process.exit(1);
}
