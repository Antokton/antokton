#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * backend/scripts/verify-postgres-integrity.js
 *
 * Post-migration verifier. Compares SQLite vs PostgreSQL and reports any
 * differences without modifying either database.
 *
 * Checks:
 *   1. Table-level row counts.
 *   2. Missing-row detection by primary key.
 *   3. JSON field structural equality.
 *   4. Users-table auth column equality (sample).
 *   5. Sessions-table integrity (sample).
 *
 * Both databases are opened read-only / read-write-but-only-SELECT respectively.
 *
 * Usage:
 *   node verify-postgres-integrity.js \
 *     --sqlite ./prod.db --pg "$DATABASE_URL" \
 *     [--sample 500] [--max-missing 20] \
 *     [--users-table users] [--sessions-table sessions] \
 *     [--json verify-report.json]
 *
 * Exit codes: 0 OK, 1 integrity FAIL, 2 usage error.
 */
'use strict';
const fs = require('fs');
let Database, Client;
try { Database = require('better-sqlite3'); } catch {}
if (!Database) {
  try {
    ({ DatabaseSync: Database } = require('node:sqlite'));
  } catch {}
}
try { ({ Client } = require('pg')); } catch {}

// ---------- CLI ------------------------------------------------------------
function parseArgs(argv) {
  const a = {
    sqlite: null, pg: process.env.DATABASE_URL || null,
    sample: 500, maxMissing: 20,
    usersTable: 'users', sessionsTable: 'sessions',
    exclude: ['sqlite_sequence', 'knex_migrations', 'knex_migrations_lock'],
    tables: null, json: null, verbose: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]; const next = () => argv[++i];
    switch (arg) {
      case '--sqlite': a.sqlite = next(); break;
      case '--pg': a.pg = next(); break;
      case '--sample': a.sample = Number(next()); break;
      case '--max-missing': a.maxMissing = Number(next()); break;
      case '--users-table': a.usersTable = next(); break;
      case '--sessions-table': a.sessionsTable = next(); break;
      case '--tables': a.tables = next().split(',').map(s => s.trim()); break;
      case '--exclude': a.exclude = next().split(',').map(s => s.trim()); break;
      case '--json': a.json = next(); break;
      case '--verbose': case '-v': a.verbose = true; break;
      case '--help': case '-h':
        console.log('See header comment for usage.'); process.exit(0);
      default: console.error('Unknown argument: ' + arg); process.exit(2);
    }
  }
  return a;
}
function requireDeps() {
  if (!Database) { console.error('Missing better-sqlite3'); process.exit(2); }
  if (!Client) { console.error('Missing pg'); process.exit(2); }
}

// ---------- helpers --------------------------------------------------------
const ISSUES = [];
function fail(g, n, d) { ISSUES.push({ group: g, name: n, detail: d, severity: 'fail' }); console.log('\x1b[31m[FAIL]\x1b[0m ' + g + ' :: ' + n + ' -- ' + d); }
function warn(g, n, d) { ISSUES.push({ group: g, name: n, detail: d, severity: 'warn' }); console.log('\x1b[33m[WARN]\x1b[0m ' + g + ' :: ' + n + ' -- ' + d); }
function pass(g, n, d = '') { console.log('\x1b[32m[PASS]\x1b[0m ' + g + ' :: ' + n + (d ? '  ' + d : '')); }
function q(name) { return '"' + String(name).replace(/"/g, '""') + '"'; }

function listSqliteTables(db, opts) {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  let names = rows.map(r => r.name);
  if (opts.tables) names = names.filter(n => opts.tables.includes(n));
  if (opts.exclude) names = names.filter(n => !opts.exclude.includes(n));
  return names;
}
function describeTable(db, table) {
  return db.prepare('PRAGMA table_info(' + q(table) + ')').all().map(c => ({
    name: c.name, type: (c.type || '').toUpperCase(), pk: !!c.pk, notnull: !!c.notnull,
  }));
}
function looksLikeJson(s) {
  if (typeof s !== 'string' || s.length < 2) return false;
  const c = s.charCodeAt(0);
  return c === 0x7b || c === 0x5b;
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
    if (!deepEqual(a[ka[i]], b[ka[i]])) return false;
  }
  return true;
}
function normalizePgValue(v) {
  if (v instanceof Date) return v.toISOString();
  return v;
}
function normalizeSqliteValue(v, type) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && (type.includes('JSON') || looksLikeJson(v))) {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}
// Cross-db equality used by auth/session checks.
// Handles pg Date<->ISO string, pg boolean<->0/1, pg jsonb<->text JSON, numeric/string drift.
function looseEqual(sv, pv) {
  const s = sv === undefined ? null : sv;
  const p = pv === undefined ? null : pv;
  if (s === null && p === null) return true;
  if (s === null || p === null) return false;
  if (p instanceof Date) {
    const sd = typeof s === 'string' ? Date.parse(s) : (typeof s === 'number' ? s : NaN);
    return Number.isFinite(sd) && sd === p.getTime();
  }
  if (s instanceof Date) {
    const pd = typeof p === 'string' ? Date.parse(p) : (typeof p === 'number' ? p : NaN);
    return Number.isFinite(pd) && pd === s.getTime();
  }
  if (typeof p === 'boolean' && (s === 0 || s === 1)) return p === !!s;
  if (typeof s === 'boolean' && (p === 0 || p === 1)) return s === !!p;
  if (typeof p === 'object' && typeof s === 'string') {
    try { return deepEqual(p, JSON.parse(s)); } catch {}
  }
  return String(s) === String(p);
}

// ---------- checks ---------------------------------------------------------
async function checkCounts(sqlite, pg, tables) {
  console.log('\n--- Count check ---');
  const results = [];
  for (const t of tables) {
    const s = sqlite.prepare('SELECT COUNT(*) AS n FROM ' + q(t)).get().n;
    let p;
    try {
      p = (await pg.query('SELECT COUNT(*)::int AS n FROM ' + q(t))).rows[0].n;
    } catch (err) {
      fail('counts', t, 'pg query failed: ' + err.message);
      continue;
    }
    if (s === p) pass('counts', t, String(s));
    else fail('counts', t, 'sqlite=' + s + ' pg=' + p + ' (delta=' + (p - s) + ')');
    results.push({ table: t, sqlite: s, pg: p });
  }
  return results;
}

async function checkMissingRows(sqlite, pg, tables, maxMissing) {
  console.log('\n--- Missing-row check ---');
  for (const t of tables) {
    const cols = describeTable(sqlite, t);
    const pkCols = cols.filter(c => c.pk).map(c => c.name);
    if (pkCols.length === 0) { warn('missing', t, 'no primary key declared; skipping'); continue; }
    const stmt = sqlite.prepare('SELECT ' + pkCols.map(q).join(',') + ' FROM ' + q(t));
    const BATCH = 500;
    let batch = [];
    let missing = [];
    let scanned = 0;
    async function flush() {
      if (batch.length === 0) return;
      const values = batch.flat();
      const placeholders = batch.map((_, i) =>
        '(' + pkCols.map((_, j) => '$' + (i * pkCols.length + j + 1)).join(',') + ')'
      ).join(',');
      const sql =
        'WITH wanted (' + pkCols.map(q).join(',') + ') AS (VALUES ' + placeholders + ') ' +
        'SELECT w.* FROM wanted w ' +
        'LEFT JOIN ' + q(t) + ' src ON ' + pkCols.map(c => 'src.' + q(c) + ' = w.' + q(c)).join(' AND ') + ' ' +
        'WHERE src.' + q(pkCols[0]) + ' IS NULL';
      try {
        const res = await pg.query(sql, values);
        for (const row of res.rows) {
          if (missing.length < maxMissing) missing.push(row);
        }
      } catch (err) {
        fail('missing', t, 'query failed: ' + err.message);
      }
      batch.length = 0;
    }
    for (const row of stmt.iterate()) {
      batch.push(pkCols.map(c => row[c]));
      scanned++;
      if (batch.length >= BATCH) await flush();
    }
    await flush();
    if (missing.length === 0) pass('missing', t, 'scanned ' + scanned + ', none missing');
    else fail('missing', t, missing.length + '+ missing rows (first: ' + JSON.stringify(missing.slice(0, 3)) + ')');
  }
}

async function checkJsonFields(sqlite, pg, tables, sample) {
  console.log('\n--- JSON field integrity ---');
  for (const t of tables) {
    const cols = describeTable(sqlite, t);
    const pkCols = cols.filter(c => c.pk).map(c => c.name);
    if (pkCols.length === 0) continue;
    const textCols = cols.filter(c => c.type.includes('TEXT') || c.type.includes('JSON'));
    if (textCols.length === 0) continue;
    const rows = sqlite.prepare(
      'SELECT ' + [...pkCols, ...textCols.map(c => c.name)].map(q).join(',') +
      ' FROM ' + q(t) + ' LIMIT ' + (Number(sample) || 500)
    ).all();
    for (const col of textCols) {
      const jsonRows = rows.filter(r => looksLikeJson(r[col.name]));
      if (jsonRows.length === 0) continue;
      let mismatches = 0, checked = 0, missing = 0;
      for (const row of jsonRows) {
        checked++;
        const where = pkCols.map((c, i) => q(c) + ' = $' + (i + 1)).join(' AND ');
        let pgRow;
        try {
          const r = await pg.query(
            'SELECT ' + q(col.name) + ' AS v FROM ' + q(t) + ' WHERE ' + where + ' LIMIT 1',
            pkCols.map(c => row[c])
          );
          if (r.rows.length === 0) { missing++; continue; }
          pgRow = r.rows[0].v;
        } catch (err) {
          fail('json', t + '.' + col.name, 'pg query failed: ' + err.message); break;
        }
        const sParsed = normalizeSqliteValue(row[col.name], col.type);
        const pParsed = typeof pgRow === 'string' && looksLikeJson(pgRow)
          ? JSON.parse(pgRow) : normalizePgValue(pgRow);
        if (!deepEqual(sParsed, pParsed)) mismatches++;
      }
      if (mismatches === 0 && missing === 0) pass('json', t + '.' + col.name, checked + ' sampled, all equal');
      else fail('json', t + '.' + col.name, mismatches + ' mismatch / ' + missing + ' missing of ' + checked);
    }
  }
}

async function checkAuthIntegrity(sqlite, pg, usersTable, sample) {
  console.log('\n--- Auth integrity (' + usersTable + ') ---');
  const exists = (await pg.query(
    'SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1', [usersTable]
  )).rows.length > 0;
  if (!exists) { warn('auth', usersTable, 'table not found in PG; skipping'); return; }
  const cols = describeTable(sqlite, usersTable).map(c => c.name);
  const candidate = ['id', 'email', 'username', 'password_hash', 'password', 'role', 'is_admin', 'admin', 'created_at'];
  const checkCols = candidate.filter(c => cols.includes(c));
  if (!checkCols.includes('id')) { warn('auth', usersTable, 'no id column; skipping'); return; }
  const SAMPLE = Math.max(1, Number(sample) || 200);
  const rows = sqlite.prepare(
    'SELECT ' + checkCols.map(q).join(',') + ' FROM ' + q(usersTable) + ' ORDER BY id LIMIT ' + SAMPLE
  ).all();
  let mismatches = 0, missing = 0;
  for (const row of rows) {
    const res = await pg.query(
      'SELECT ' + checkCols.map(q).join(',') + ' FROM ' + q(usersTable) + ' WHERE id = $1 LIMIT 1', [row.id]
    );
    if (res.rows.length === 0) { missing++; continue; }
    const pgRow = res.rows[0];
    for (const c of checkCols) if (!looseEqual(row[c], pgRow[c])) mismatches++;
  }
  if (mismatches === 0 && missing === 0) pass('auth', usersTable, rows.length + ' users, ' + checkCols.length + ' cols, all equal');
  else fail('auth', usersTable, mismatches + ' field mismatches, ' + missing + ' missing users (of ' + rows.length + ' sampled)');
}

async function checkSessionIntegrity(sqlite, pg, sessionsTable, sample) {
  console.log('\n--- Session integrity (' + sessionsTable + ') ---');
  const exists = (await pg.query(
    'SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1', [sessionsTable]
  )).rows.length > 0;
  if (!exists) { warn('sessions', sessionsTable, 'table not found in PG; skipping'); return; }
  const cols = describeTable(sqlite, sessionsTable).map(c => c.name);
  const idCol = cols.includes('id') ? 'id' : (cols.includes('sid') ? 'sid' : (cols.includes('token') ? 'token' : null));
  if (!idCol) { warn('sessions', sessionsTable, 'no id/sid/token column; skipping'); return; }
  const candidate = [idCol, 'user_id', 'token', 'refresh_token', 'expires_at', 'revoked_at', 'ip', 'user_agent'];
  const checkCols = candidate.filter(c => cols.includes(c));
  const SAMPLE = Math.max(1, Number(sample) || 200);
  const rows = sqlite.prepare(
    'SELECT ' + checkCols.map(q).join(',') + ' FROM ' + q(sessionsTable) + ' LIMIT ' + SAMPLE
  ).all();
  let mismatches = 0, missing = 0;
  for (const row of rows) {
    const res = await pg.query(
      'SELECT ' + checkCols.map(q).join(',') + ' FROM ' + q(sessionsTable) + ' WHERE ' + q(idCol) + ' = $1 LIMIT 1', [row[idCol]]
    );
    if (res.rows.length === 0) { missing++; continue; }
    const pgRow = res.rows[0];
    for (const c of checkCols) if (!looseEqual(row[c], pgRow[c])) mismatches++;
  }
  if (mismatches === 0 && missing === 0) pass('sessions', sessionsTable, rows.length + ' sessions, ' + checkCols.length + ' cols, all equal');
  else fail('sessions', sessionsTable, mismatches + ' field mismatches, ' + missing + ' missing (of ' + rows.length + ' sampled)');
}

// ---------- main -----------------------------------------------------------
(async function main() {
  requireDeps();
  const opts = parseArgs(process.argv);
  if (!opts.sqlite || !fs.existsSync(opts.sqlite)) { console.error('SQLite not found: ' + opts.sqlite); process.exit(2); }
  if (!opts.pg) { console.error('--pg or DATABASE_URL required'); process.exit(2); }
  const sqlite = new Database(opts.sqlite, { readonly: true, fileMustExist: true });
  const pgConfig = { connectionString: opts.pg };
  if (/render\.com/i.test(opts.pg) || /sslmode=require/i.test(opts.pg)) {
    pgConfig.ssl = { rejectUnauthorized: false };
  }
  const pg = new Client(pgConfig);
  await pg.connect();
  const sqliteTables = listSqliteTables(sqlite, opts);
  const pgTablesRes = await pg.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'"
  );
  const pgTables = new Set(pgTablesRes.rows.map(r => r.table_name));
  const tables = sqliteTables.filter(t => pgTables.has(t));
  const onlyInSqlite = sqliteTables.filter(t => !pgTables.has(t));
  const onlyInPg = [...pgTables].filter(t => !sqliteTables.includes(t));
  if (onlyInSqlite.length) warn('schema', 'tables-only-in-sqlite', onlyInSqlite.join(', '));
  if (onlyInPg.length) console.log('Note: PG has additional tables not in SQLite: ' + onlyInPg.join(', '));
  const counts = await checkCounts(sqlite, pg, tables);
  await checkMissingRows(sqlite, pg, tables, opts.maxMissing);
  await checkJsonFields(sqlite, pg, tables, opts.sample);
  await checkAuthIntegrity(sqlite, pg, opts.usersTable, opts.sample);
  await checkSessionIntegrity(sqlite, pg, opts.sessionsTable, opts.sample);
  const fails = ISSUES.filter(i => i.severity === 'fail').length;
  const warns = ISSUES.filter(i => i.severity === 'warn').length;
  console.log('\n==== Integrity Verification Summary ====');
  console.log('FAIL: ' + fails + '    WARN: ' + warns);
  if (opts.json) {
    fs.writeFileSync(opts.json, JSON.stringify({
      ts: new Date().toISOString(), fails, warns, counts, issues: ISSUES,
    }, null, 2));
    console.log('Wrote JSON report to ' + opts.json);
  }
  await pg.end(); sqlite.close();
  process.exit(fails > 0 ? 1 : 0);
})().catch(err => { console.error('Fatal error:', err); process.exit(1); });
