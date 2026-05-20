#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cross-platform staging validation runner.
 *
 * This mirrors staging-validation.sh for Windows/PowerShell users and keeps
 * smoke testing after integrity because smoke creates test auth/upload rows.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseArgs(argv) {
  const args = {
    base: '',
    pg: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || '',
    sqlite: '',
    adminToken: '',
    keepGoing: false,
    skip: new Set(),
    migration: 'skip',
    truncateMigration: false,
    confirmMigration: false,
    rollbackLog: '',
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--base':
        args.base = next();
        break;
      case '--pg':
        args.pg = next();
        break;
      case '--sqlite':
        args.sqlite = next();
        break;
      case '--admin-token':
        args.adminToken = next();
        break;
      case '--keep-going':
        args.keepGoing = true;
        break;
      case '--skip':
        args.skip = new Set(next().split(',').map(s => s.trim()).filter(Boolean));
        break;
      case '--migration':
        args.migration = next();
        break;
      case '--truncate-migration':
        args.truncateMigration = true;
        break;
      case '--confirm-migration':
        args.confirmMigration = true;
        break;
      case '--rollback-log':
        args.rollbackLog = next();
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(2);
    }
  }

  args.base = args.base.replace(/\/+$/, '');
  return args;
}

function printHelp() {
  console.log(`Usage: node backend/scripts/staging-validation.js --base <url> [options]

Options:
  --pg <url>                  Staging PostgreSQL URL, or STAGING_DATABASE_URL
  --sqlite <path>             SQLite source snapshot for migration/integrity
  --migration skip|dry-run|live
  --truncate-migration        Truncate matching staging PG tables before live insert
  --confirm-migration         Required with --migration live
  --rollback-log <path>       JSONL rollback log path
  --admin-token <token>       Optional admin token for smoke checks
  --skip <csv>                Skip step names: migration-dry-run,migration-live,integrity,diag,smoke
  --keep-going                Continue after failed steps
`);
}

function validateArgs(args) {
  if (!args.base) throw new Error('--base <url> is required');
  if (!['skip', 'dry-run', 'live'].includes(args.migration)) {
    throw new Error('--migration must be skip, dry-run, or live');
  }
  if (args.migration !== 'skip' && (!args.pg || !args.sqlite)) {
    throw new Error('--migration requires both --pg and --sqlite');
  }
  if (args.migration === 'live' && !args.confirmMigration) {
    throw new Error('live migration requires --confirm-migration');
  }
}

function utcStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function writeLog(logFile, text) {
  fs.appendFileSync(logFile, text);
}

function displaySecretState(value) {
  return value ? '<set>' : '<unset>';
}

async function healthCheck(url, logFile, allow404 = false) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await response.text();
  writeLog(logFile, body);
  console.log(body);
  if (!response.ok && !(allow404 && response.status === 404)) {
    throw new Error(`${url} returned ${response.status}`);
  }
}

function runCommand(command, args, logFile, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: false,
      windowsHide: true,
    });

    child.stdout.on('data', chunk => {
      process.stdout.write(chunk);
      writeLog(logFile, chunk);
    });
    child.stderr.on('data', chunk => {
      process.stderr.write(chunk);
      writeLog(logFile, chunk);
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  validateArgs(args);

  const repoRoot = path.resolve(__dirname, '..', '..');
  const outDir = path.join(repoRoot, 'validation-runs', utcStamp());
  fs.mkdirSync(outDir, { recursive: true });

  if (!args.rollbackLog) {
    args.rollbackLog = path.join(outDir, 'migration-rollback.jsonl');
  }

  console.log('================================================================');
  console.log(' Antokton staging validation');
  console.log('================================================================');
  console.log(` Base URL:  ${args.base}`);
  console.log(` PG:        ${displaySecretState(args.pg)}`);
  console.log(` SQLite:    ${args.sqlite || '<unset>'}`);
  console.log(` Migration: ${args.migration}`);
  console.log(` Output:    ${outDir}`);
  console.log('----------------------------------------------------------------');

  let failed = 0;

  async function step(name, fn) {
    console.log(`\n>>> STEP: ${name}`);
    if (args.skip.has(name)) {
      console.log('    SKIPPED (--skip)');
      return;
    }

    const logFile = path.join(outDir, `${name}.log`);
    console.log(`    log:  ${logFile}`);

    try {
      await fn(logFile);
      console.log(`    OK: ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`    FAIL: ${name} (${err.message})`);
      if (!args.keepGoing) {
        throw err;
      }
    }
  }

  try {
    await step('health', logFile => healthCheck(`${args.base}/health`, logFile));
    await step('health-db', logFile => healthCheck(`${args.base}/health/db`, logFile, true));

    if (args.migration === 'dry-run') {
      await step('migration-dry-run', logFile => runCommand(process.execPath, [
        path.join(repoRoot, 'backend', 'migrate-sqlite-to-postgres.js'),
        '--sqlite', args.sqlite,
        '--pg', args.pg,
        '--dry-run',
        '--rollback-log', args.rollbackLog,
      ], logFile, { cwd: repoRoot }));
    } else if (args.migration === 'live') {
      const migrationArgs = [
        path.join(repoRoot, 'backend', 'migrate-sqlite-to-postgres.js'),
        '--sqlite', args.sqlite,
        '--pg', args.pg,
        '--confirm',
        '--rollback-log', args.rollbackLog,
      ];
      if (args.truncateMigration) migrationArgs.push('--truncate');
      await step('migration-live', logFile => runCommand(process.execPath, migrationArgs, logFile, { cwd: repoRoot }));
    } else {
      console.log('>>> STEP: migration');
      console.log('    SKIPPED (run with --migration dry-run or --migration live)');
    }

    if (args.pg && args.sqlite) {
      await step('integrity', logFile => runCommand(process.execPath, [
        path.join(repoRoot, 'backend', 'scripts', 'verify-postgres-integrity.js'),
        '--sqlite', args.sqlite,
        '--pg', args.pg,
        '--sample', '500',
        '--json', path.join(outDir, 'integrity-report.json'),
      ], logFile, { cwd: repoRoot }));
    } else {
      console.log('>>> STEP: integrity');
      console.log('    SKIPPED (need both --pg and --sqlite)');
    }

    if (args.pg) {
      await step('diag', logFile => runCommand(process.execPath, [
        path.join(repoRoot, 'backend', 'scripts', 'pg-diagnostics.js'),
        '--pg', args.pg,
        '--json', path.join(outDir, 'pg-diagnostics.json'),
      ], logFile, { cwd: repoRoot }));
    } else {
      console.log('>>> STEP: diag');
      console.log('    SKIPPED (need --pg)');
    }

    const smokeArgs = [
      path.join(repoRoot, 'backend', 'scripts', 'smoke-test.js'),
      '--base', args.base,
      '--json', path.join(outDir, 'smoke-results.json'),
    ];
    if (args.adminToken) smokeArgs.push('--admin-token', args.adminToken);
    await step('smoke', logFile => runCommand(process.execPath, smokeArgs, logFile, { cwd: repoRoot }));
  } catch {
    // Failure has already been logged by step().
  }

  console.log('\n================================================================');
  if (failed === 0) console.log(' RESULT: all checks passed');
  else console.log(` RESULT: ${failed} step(s) failed -- see ${outDir} for details`);
  console.log('================================================================');

  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err.message);
  process.exit(2);
});
