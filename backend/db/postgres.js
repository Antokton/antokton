/**
 * backend/db/postgres.js
 *
 * Production-grade PostgreSQL connection layer.
 *
 * Responsibilities:
 *   - Single shared pg.Pool, sized from env, with sane defaults.
 *   - Connection-level guards (statement_timeout, idle_in_transaction_session_timeout).
 *   - Health probe used by /health and /health/db.
 *   - Wrapped query helpers that log slow queries and emit metrics.
 *   - Safe transaction helper with automatic ROLLBACK on throw.
 *
 * Safe to import in both runtime modes; if DB_MODE !== 'postgres' the pool
 * is never constructed, so the production SQLite path is undisturbed.
 */

'use strict';

const { Pool } = require('pg');

const DB_MODE = process.env.DB_MODE || 'sqlite';

// ---------- Configuration --------------------------------------------------

const POOL_MAX = Number(process.env.PG_POOL_MAX || 20);
const POOL_MIN = Number(process.env.PG_POOL_MIN || 2);
const IDLE_TIMEOUT_MS = Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000);
const CONNECTION_TIMEOUT_MS = Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5_000);
const STATEMENT_TIMEOUT_MS = Number(process.env.PG_STATEMENT_TIMEOUT_MS || 30_000);
const IDLE_IN_TXN_TIMEOUT_MS = Number(process.env.PG_IDLE_IN_TXN_TIMEOUT_MS || 60_000);
const SLOW_QUERY_MS = Number(process.env.PG_SLOW_QUERY_MS || 250);

// ---------- Pool (lazy) ----------------------------------------------------

let pool = null;

function getPool() {
  if (DB_MODE !== 'postgres') {
    throw new Error('postgres.getPool() called while DB_MODE != postgres');
  }
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_MAX,
    min: POOL_MIN,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    // Render-managed Postgres requires TLS.
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    application_name: process.env.APP_NAME || 'antokton-api',
  });

  // Apply server-side guards to every new connection.
  pool.on('connect', (client) => {
    client.query(`
      SET statement_timeout = ${STATEMENT_TIMEOUT_MS};
      SET idle_in_transaction_session_timeout = ${IDLE_IN_TXN_TIMEOUT_MS};
      SET lock_timeout = '10s';
    `).catch((err) => {
      // Logging only; don't crash the server because a session guard failed.
      console.error('[pg] failed to apply session guards:', err.message);
    });
  });

  pool.on('error', (err) => {
    console.error('[pg] idle client error:', err.message);
  });

  return pool;
}

// ---------- Query helpers --------------------------------------------------

async function query(text, params, { tag } = {}) {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const elapsed = Date.now() - start;
    if (elapsed > SLOW_QUERY_MS) {
      console.warn(`[pg-slow] ${elapsed}ms ${tag || ''}  ${text.split('\n')[0].slice(0, 200)}`);
    }
    return res;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[pg-err] ${elapsed}ms ${tag || ''} ${err.code || ''} ${err.message}`);
    throw err;
  }
}

/**
 * Run a callback inside a single connection + transaction. Automatically
 * BEGIN / COMMIT, and ROLLBACK on throw.
 *
 * Usage:
 *   await transaction(async (tx) => {
 *     await tx.query('UPDATE ...');
 *     await tx.query('INSERT ...');
 *   });
 */
async function transaction(fn) {
  const p = getPool();
  const client = await p.connect();
  const tx = {
    query: (text, params) => client.query(text, params),
    client,
  };
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* swallow */ }
    throw err;
  } finally {
    client.release();
  }
}

// ---------- Health ---------------------------------------------------------

async function healthCheck() {
  if (DB_MODE !== 'postgres') {
    return { mode: 'sqlite', ok: true };
  }
  try {
    const start = Date.now();
    const r = await query('SELECT 1 AS ok', [], { tag: 'health' });
    const p = getPool();
    return {
      mode: 'postgres',
      ok: r.rows[0].ok === 1,
      latencyMs: Date.now() - start,
      pool: {
        total: p.totalCount,
        idle: p.idleCount,
        waiting: p.waitingCount,
        max: POOL_MAX,
      },
    };
  } catch (err) {
    return { mode: 'postgres', ok: false, error: err.message };
  }
}

// ---------- Graceful shutdown ---------------------------------------------

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  DB_MODE,
  getPool,
  query,
  transaction,
  healthCheck,
  close,
};
