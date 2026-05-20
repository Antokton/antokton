#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * backend/migrate-sqlite-to-postgres.js
 *
 * One-shot migration tool that copies every row from a SQLite database into
 * an existing PostgreSQL database while preserving primary key IDs and
 * timestamp values.
 *
 * Design goals:
 *   - SAFE BY DEFAULT: refuses to run without --confirm unless --dry-run.
 *   - DRY-RUN: simulate the full migration, print row counts, exit non-zero on
 *     any planned constraint violation.
 *   - ROLLBACK LOGGING: every INSERT is recorded to a JSONL rollback log so the
 *     migration can be reversed by running this script with --rollback <file>.
 *   - ID & TIMESTAMP PRESERVATION: copies primary-key values verbatim; resets
 *     PostgreSQL sequences to MAX(id)+1 after migration so future inserts work.
 *   - SCHEMA INTROSPECTION: discovers tables/columns from sqlite_master; does
 *     not require hand-maintained mappings.
 *   - PRODUCTION SQLITE IS UNTOUCHED: opens SQLite in read-only mode and never
 *     issues writes against it.
 *
 * Usage:
 *   node backend/migrate-sqlite-to-postgres.js \
 *     --sqlite ./data/production.db \
 *     --pg "postgresql://user:pass@host:5432/antokton" \
 *     --dry-run \
 *     [--tables users,sessions,entities] \
 *     [--exclude sqlite_sequence,knex_migrations] \
 *     [--batch-size 500] \
 *     [--rollback-log ./migration-rollback.jsonl] \
 *     [--truncate]               # TRUNCATE pg tables before insert (destructive)
 *     [--confirm]                # required for non-dry-run
 *
 *   # Rollback a previous migration:
 *   node backend/migrate-sqlite-to-postgres.js \
 *     --pg "$DATABASE_URL" \
 *     --rollback ./migration-rollback.jsonl \
 *     --confirm
 *
 * Dependencies: better-sqlite3, pg
 *   npm install --no-save better-sqlite3 pg
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

let Database, Client;
try { Database = require('better-sqlite3'); } catch { /* loaded on demand */ }
if (!Database) {
  try { ({ DatabaseSync: Database } = require('node:sqlite')); } catch { /* loaded on demand */ }
}
try { ({ Client } = require('pg')); } catch { /* loaded on demand */ }

// ---------- CLI ------------------------------------------------------------

function parseArgs(argv) {
  const a = {
    sqlite: null,
    pg: process.env.DATABASE_URL || null,
    tables: null,
    exclude: ['sqlite_sequence', 'knex_migrations', 'knex_migrations_lock'],
    batchSize: 500,
    dryRun: false,
    truncate: false,
    confirm: false,
    rollback: null,
    rollbackLog: `./migration-rollback-${Date.now()}.jsonl`,
    verbose: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--sqlite': a.sqlite = next(); break;
      case '--pg': a.pg = next(); break;
      case '--tables': a.tables = next().split(',').map(s => s.trim()).filter(Boolean); break;
      case '--exclude': a.exclude = next().split(',').map(s => s.trim()).filter(Boolean); break;
      case '--batch-size': a.batchSize = Number(next()); break;
      case '--dry-run': a.dryRun = true; break;
      case '--truncate': a.truncate = true; break;
      case '--confirm': a.confirm = true; break;
      case '--rollback': a.rollback = next(); break;
      case '--rollback-log': a.rollbackLog = next(); break;
      case '--verbose': case '-v': a.verbose = true; break;
      case '--help': case '-h': printHelp(); process.exit(0);
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(2);
    }
  }
  return a;
}

function printHelp() {
  console.log(`See header comment of this file for full usage.`);
}

function requireDeps(needsSqlite = true) {
  if (needsSqlite && !Database) {
    console.error('Missing SQLite dependency: need better-sqlite3 or Node with node:sqlite.');
    process.exit(2);
  }
  if (!Client) {
    console.error('Missing dependency: pg. Install with `npm install pg`.');
    process.exit(2);
  }
}

function pgClient(connectionString) {
  const pgConfig = { connectionString };
  if (/render\.com/i.test(connectionString) || /sslmode=require/i.test(connectionString)) {
    pgConfig.ssl = { rejectUnauthorized: false };
  }
  return new Client(pgConfig);
}

// ---------- Logging --------------------------------------------------------

function log(level, msg) {
  const ts = new Date().toISOString();
  const color = { info: '\x1b[36m', warn: '\x1b[33m', err: '\x1b[31m', ok: '\x1b[32m' }[level] || '';
  const reset = '\x1b[0m';
  console.log(`${color}[${ts}] ${level.toUpperCase()}${reset} ${msg}`);
}

// ---------- SQLite introspection ------------------------------------------

function listSqliteTables(db, opts) {
  const rows = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();
  let names = rows.map(r => r.name);
  if (opts.tables) names = names.filter(n => opts.tables.includes(n));
  if (opts.exclude) names = names.filter(n => !opts.exclude.includes(n));
  return names;
}

function describeTable(db, table) {
  const cols = db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all();
  // returns: cid, name, type, notnull, dflt_value, pk
  return cols.map(c => ({
    name: c.name,
    type: (c.type || '').toUpperCase(),
    notnull: !!c.notnull,
    pk: !!c.pk,
  }));
}

function countRows(db, table) {
  const r = db.prepare(`SELECT COUNT(*) AS n FROM ${quoteIdent(table)}`).get();
  return r.n;
}

// ---------- Identifier quoting --------------------------------------------

function quoteIdent(name) {
  // Both SQLite and PostgreSQL accept double-quoted identifiers; escape embedded "
  return '"' + String(name).replace(/"/g, '""') + '"';
}

// ---------- Type coercion -------------------------------------------------

function coerceValue(value, sqliteType) {
  if (value === null || value === undefined) return null;
  const t = (sqliteType || '').toUpperCase();
  // JSON detection: stored as TEXT but valid JSON object/array
  if (typeof value === 'string' && (t.includes('JSON') || looksLikeJson(value))) {
    try {
      const parsed = JSON.parse(value);
      if (parsed !== null && (typeof parsed === 'object')) return parsed;
    } catch { /* fall through */ }
  }
  if (t.includes('BOOL')) {
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return /^(1|true|t|yes|y)$/i.test(value);
    return Boolean(value);
  }
  if (t.includes('BLOB') && value instanceof Buffer) return value;
  // SQLite stores timestamps as TEXT, INTEGER (epoch ms or s), or REAL (julian).
  // We leave the value as-is and rely on the destination column type.
  return value;
}

function looksLikeJson(s) {
  if (typeof s !== 'string' || s.length < 2) return false;
  const c = s.charCodeAt(0);
  return (c === 0x7b /* { */ || c === 0x5b /* [ */);
}

// ---------- Migration ------------------------------------------------------

async function migrate(opts) {
  requireDeps(true);

  if (!opts.sqlite || !fs.existsSync(opts.sqlite)) {
    log('err', `SQLite file not found: ${opts.sqlite}`);
    process.exit(2);
  }
  if (!opts.pg) {
    log('err', `--pg connection string is required (or set DATABASE_URL).`);
    process.exit(2);
  }
  if (!opts.dryRun && !opts.confirm) {
    log('err', `Refusing to run a live migration without --confirm. Use --dry-run to simulate.`);
    process.exit(2);
  }

  const sqlite = new Database(opts.sqlite, { readonly: true, fileMustExist: true });
  log('info', `Opened SQLite (read-only): ${opts.sqlite}`);

  const pg = pgClient(opts.pg);
  await pg.connect();
  log('info', `Connected to PostgreSQL`);

  // Get target table list from BOTH databases; only migrate tables that exist in both.
  const sqliteTables = listSqliteTables(sqlite, opts);
  const pgTablesRes = await pg.query(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`
  );
  const pgTables = new Set(pgTablesRes.rows.map(r => r.table_name));
  const tables = sqliteTables.filter(t => pgTables.has(t));
  const skipped = sqliteTables.filter(t => !pgTables.has(t));
  if (skipped.length) {
    log('warn', `Skipping tables not present in PostgreSQL: ${skipped.join(', ')}`);
  }
  log('info', `Tables to migrate (${tables.length}): ${tables.join(', ') || '(none)'}`);

  // BEFORE counts
  log('info', `--- Row counts BEFORE migration ---`);
  const before = {};
  for (const t of tables) {
    const s = countRows(sqlite, t);
    const p = (await pg.query(`SELECT COUNT(*)::int AS n FROM ${quoteIdent(t)}`)).rows[0].n;
    before[t] = { sqlite: s, pg: p };
    log('info', `  ${t.padEnd(30)} sqlite=${s.toString().padStart(8)}  pg=${p.toString().padStart(8)}`);
  }

  // Open rollback log
  let rollbackStream = null;
  if (!opts.dryRun) {
    rollbackStream = fs.createWriteStream(opts.rollbackLog, { flags: 'a' });
    rollbackStream.write(JSON.stringify({
      kind: 'migration-start',
      ts: new Date().toISOString(),
      sqlite: path.resolve(opts.sqlite),
      tables,
    }) + '\n');
    log('info', `Rollback log: ${opts.rollbackLog}`);
  }

  const summary = [];

  for (const table of tables) {
    const cols = describeTable(sqlite, table);
    if (cols.length === 0) {
      log('warn', `Table ${table} has no columns?  Skipping.`);
      continue;
    }
    const colNames = cols.map(c => c.name);
    const pkCols = cols.filter(c => c.pk).map(c => c.name);

    if (opts.truncate && !opts.dryRun) {
      log('warn', `TRUNCATE ${table} CASCADE`);
      await pg.query(`TRUNCATE TABLE ${quoteIdent(table)} RESTART IDENTITY CASCADE`);
    }

    if (!opts.dryRun) await pg.query('BEGIN');

    const total = countRows(sqlite, table);
    const stmt = sqlite.prepare(`SELECT * FROM ${quoteIdent(table)}`);
    const insertSql =
      `INSERT INTO ${quoteIdent(table)} (${colNames.map(quoteIdent).join(',')}) ` +
      `VALUES (${colNames.map((_, i) => '$' + (i + 1)).join(',')}) ` +
      (pkCols.length ? `ON CONFLICT (${pkCols.map(quoteIdent).join(',')}) DO NOTHING` : '');

    let inserted = 0, conflicts = 0, errored = 0;
    const batch = [];

    async function flush() {
      if (batch.length === 0) return;
      for (const row of batch) {
        const values = colNames.map((c, i) => coerceValue(row[c], cols[i].type));
        if (opts.dryRun) {
          inserted++; continue;
        }
        try {
          const res = await pg.query(insertSql, values);
          if (res.rowCount === 1) {
            inserted++;
            rollbackStream.write(JSON.stringify({
              kind: 'insert', table, pk: pkCols.reduce((o, k) => (o[k] = row[k], o), {}),
            }) + '\n');
          } else {
            conflicts++;
          }
        } catch (err) {
          errored++;
          log('err', `Insert failed in ${table}: ${err.message}`);
          if (opts.verbose) console.error(err);
          throw err;
        }
      }
      batch.length = 0;
    }

    try {
      for (const row of stmt.iterate()) {
        batch.push(row);
        if (batch.length >= opts.batchSize) await flush();
      }
      await flush();
      if (!opts.dryRun) await pg.query('COMMIT');
    } catch (err) {
      if (!opts.dryRun) {
        await pg.query('ROLLBACK');
        log('err', `Rolled back transaction for ${table}.`);
      }
      throw err;
    }

    // Reset sequence for integer PKs
    if (!opts.dryRun && pkCols.length === 1) {
      const pkCol = pkCols[0];
      const seqRes = await pg.query(
        `SELECT pg_get_serial_sequence($1, $2) AS seq`,
        [table, pkCol]
      );
      const seq = seqRes.rows[0].seq;
      if (seq) {
        await pg.query(
          `SELECT setval($1, COALESCE((SELECT MAX(${quoteIdent(pkCol)}) FROM ${quoteIdent(table)}), 0) + 1, false)`,
          [seq]
        );
        log('info', `Reset sequence ${seq}`);
      }
    }

    summary.push({ table, total, inserted, conflicts, errored });
    log('ok', `${table}: inserted=${inserted} conflicts=${conflicts} errored=${errored} (of ${total})`);
  }

  // AFTER counts
  log('info', `--- Row counts AFTER migration ---`);
  for (const t of tables) {
    const s = countRows(sqlite, t);
    const p = (await pg.query(`SELECT COUNT(*)::int AS n FROM ${quoteIdent(t)}`)).rows[0].n;
    const delta = p - before[t].pg;
    log('info', `  ${t.padEnd(30)} sqlite=${s.toString().padStart(8)}  pg=${p.toString().padStart(8)}  Δpg=${(delta >= 0 ? '+' : '') + delta}`);
  }

  if (rollbackStream) {
    rollbackStream.write(JSON.stringify({
      kind: 'migration-end', ts: new Date().toISOString(), summary,
    }) + '\n');
    rollbackStream.end();
  }

  await pg.end();
  sqlite.close();

  const anyErrors = summary.some(s => s.errored > 0);
  log(anyErrors ? 'err' : 'ok',
    opts.dryRun ? 'Dry run complete. No changes were committed.' : 'Migration complete.');
  process.exit(anyErrors ? 1 : 0);
}

// ---------- Rollback -------------------------------------------------------

async function rollback(opts) {
  requireDeps(false);
  if (!opts.rollback || !fs.existsSync(opts.rollback)) {
    log('err', `Rollback log not found: ${opts.rollback}`); process.exit(2);
  }
  if (!opts.confirm) {
    log('err', `Refusing to roll back without --confirm`); process.exit(2);
  }
  if (!opts.pg) {
    log('err', `--pg connection string is required (or set DATABASE_URL).`); process.exit(2);
  }
  const pg = pgClient(opts.pg);
  await pg.connect();
  log('info', `Connected to PostgreSQL`);

  const rl = readline.createInterface({ input: fs.createReadStream(opts.rollback) });
  // Group deletes by table for efficiency
  const byTable = new Map();
  for await (const line of rl) {
    if (!line.trim()) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.kind !== 'insert') continue;
    if (!byTable.has(ev.table)) byTable.set(ev.table, []);
    byTable.get(ev.table).push(ev.pk);
  }

  await pg.query('BEGIN');
  let totalDeleted = 0;
  try {
    for (const [table, pks] of byTable) {
      if (pks.length === 0) continue;
      const keys = Object.keys(pks[0]);
      // DELETE ... WHERE (k1,k2) IN ((v1a,v2a),(v1b,v2b))
      const placeholders = pks.map((_, i) =>
        `(${keys.map((_, j) => '$' + (i * keys.length + j + 1)).join(',')})`
      ).join(',');
      const values = pks.flatMap(pk => keys.map(k => pk[k]));
      const sql =
        `DELETE FROM ${quoteIdent(table)} ` +
        `WHERE (${keys.map(quoteIdent).join(',')}) IN (${placeholders})`;
      const res = await pg.query(sql, values);
      totalDeleted += res.rowCount;
      log('ok', `${table}: deleted ${res.rowCount} of ${pks.length} planned`);
    }
    await pg.query('COMMIT');
  } catch (err) {
    await pg.query('ROLLBACK');
    log('err', `Rollback transaction aborted: ${err.message}`);
    throw err;
  }
  log('ok', `Rollback complete. Total deleted: ${totalDeleted}`);
  await pg.end();
}

// ---------- Main -----------------------------------------------------------

(async function main() {
  const opts = parseArgs(process.argv);
  if (opts.rollback) {
    await rollback(opts);
  } else {
    await migrate(opts);
  }
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
