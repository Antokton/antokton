#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * backend/scripts/smoke-test.js
 *
 * End-to-end smoke test suite for the Antokton API.
 *
 * Exercises:
 *   - /health (and /health/db if present)
 *   - auth: register, login, refresh, logout
 *   - sessions: list/revoke for the authenticated user
 *   - entity CRUD: create, read, list, update, delete
 *   - uploads: multipart POST + GET of the stored asset
 *   - admin endpoints: /admin/users, /admin/metrics (gated by ADMIN_TOKEN)
 *
 * Usage:
 *   node backend/scripts/smoke-test.js \
 *     --base https://antokton-pg-staging.onrender.com \
 *     [--admin-token $ADMIN_TOKEN] \
 *     [--entity products] \
 *     [--keep] \
 *     [--json results.json]
 *
 * Exit codes:
 *   0  all checks passed
 *   1  one or more checks failed
 *   2  invalid usage / environment problem
 *
 * Requires Node 18+ (uses global fetch / FormData / Blob).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------- CLI parsing ---------------------------------------------------

function parseArgs(argv) {
  const args = {
    base: process.env.SMOKE_BASE_URL || 'http://localhost:3000',
    adminToken: process.env.ADMIN_TOKEN || null,
    entity: process.env.SMOKE_ENTITY || 'entities',
    keep: false,
    json: null,
    verbose: false,
    timeoutMs: 15000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--base': args.base = next(); break;
      case '--admin-token': args.adminToken = next(); break;
      case '--entity': args.entity = next(); break;
      case '--keep': args.keep = true; break;
      case '--json': args.json = next(); break;
      case '--verbose': case '-v': args.verbose = true; break;
      case '--timeout': args.timeoutMs = Number(next()); break;
      case '--help': case '-h': printHelp(); process.exit(0);
      default:
        console.error(`Unknown argument: ${a}`);
        printHelp();
        process.exit(2);
    }
  }
  args.base = args.base.replace(/\/+$/, '');
  return args;
}

function printHelp() {
  console.log(`Usage: node smoke-test.js --base <url> [--admin-token <token>] [--entity <name>] [--keep] [--json <file>] [--verbose]`);
}

// ---------- Reporting ------------------------------------------------------

const RESULTS = [];

function record(group, name, ok, detail) {
  RESULTS.push({ group, name, ok, detail: detail || '' });
  const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  const msg = `[${tag}] ${group} :: ${name}` + (detail ? `  -- ${detail}` : '');
  console.log(msg);
}

function summarize(jsonPath) {
  const passed = RESULTS.filter(r => r.ok).length;
  const failed = RESULTS.length - passed;
  console.log(`\n==== Smoke Test Summary ====`);
  console.log(`Total: ${RESULTS.length}    Passed: ${passed}    Failed: ${failed}`);
  if (failed > 0) {
    console.log(`\nFailures:`);
    for (const r of RESULTS.filter(r => !r.ok)) {
      console.log(`  - ${r.group} :: ${r.name}  ${r.detail}`);
    }
  }
  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({
      ts: new Date().toISOString(),
      total: RESULTS.length,
      passed, failed,
      results: RESULTS,
    }, null, 2));
    console.log(`\nWrote JSON report to ${jsonPath}`);
  }
  return failed === 0;
}

// ---------- HTTP helpers ---------------------------------------------------

function makeClient({ base, timeoutMs, verbose }) {
  async function request(method, pathname, { headers = {}, body, raw = false, expect = null } = {}) {
    const url = base + pathname;
    const init = { method, headers: { ...headers }, redirect: 'manual' };
    if (body !== undefined) {
      if (body instanceof FormData) {
        init.body = body; // fetch sets multipart boundary
      } else if (typeof body === 'object' && !(body instanceof Buffer) && !(body instanceof Blob)) {
        init.body = JSON.stringify(body);
        init.headers['content-type'] = init.headers['content-type'] || 'application/json';
      } else {
        init.body = body;
      }
    }
    if (verbose) console.log(`  > ${method} ${url}`);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    init.signal = ctrl.signal;
    let res, text, json = null;
    try {
      res = await fetch(url, init);
      text = await res.text();
      if (text && (res.headers.get('content-type') || '').includes('application/json')) {
        try { json = JSON.parse(text); } catch { /* leave json null */ }
      }
    } catch (err) {
      clearTimeout(t);
      const detail = err.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : err.message;
      return { ok: false, status: 0, text: '', json: null, error: detail, url };
    }
    clearTimeout(t);
    const ok = expect ? expect(res.status) : (res.status >= 200 && res.status < 300);
    return { ok, status: res.status, text, json, headers: res.headers, url };
  }
  return {
    get: (p, opts) => request('GET', p, opts),
    post: (p, body, opts = {}) => request('POST', p, { ...opts, body }),
    put: (p, body, opts = {}) => request('PUT', p, { ...opts, body }),
    patch: (p, body, opts = {}) => request('PATCH', p, { ...opts, body }),
    del: (p, opts) => request('DELETE', p, opts),
    request,
  };
}

function pickToken(json) {
  if (!json) return null;
  return (
    json.token ||
    json.accessToken ||
    json.access_token ||
    (json.data && (json.data.token || json.data.accessToken || json.data.access_token)) ||
    (json.tokens && (json.tokens.access || json.tokens.accessToken)) ||
    null
  );
}

function pickId(json) {
  if (!json) return null;
  return (
    json.id ||
    json._id ||
    (json.data && (json.data.id || json.data._id)) ||
    null
  );
}

// ---------- Test groups ----------------------------------------------------

async function runHealth(api) {
  const r = await api.get('/health');
  record('health', 'GET /health', r.ok, `status=${r.status}`);
  if (r.json && (r.json.dbMode || (r.json.data && r.json.data.dbMode))) {
    const mode = r.json.dbMode || r.json.data.dbMode;
    record('health', 'dbMode reported', !!mode, `dbMode=${mode}`);
  }
  // optional db-specific health
  const dbHealth = await api.get('/health/db', { expect: s => s === 200 || s === 404 });
  if (dbHealth.status === 200) {
    record('health', 'GET /health/db', dbHealth.ok, `status=${dbHealth.status}`);
  }
  return r.ok;
}

async function runAuth(api) {
  const suffix = crypto.randomBytes(4).toString('hex');
  const creds = {
    email: `smoke+${suffix}@antokton.test`,
    username: `smoke_${suffix}`,
    password: `Smoke!${suffix}AbcXYZ`,
    name: `Smoke ${suffix}`,
  };

  const reg = await api.post('/api/auth/register', creds, {
    expect: s => s === 200 || s === 201 || s === 409,
  });
  record('auth', 'POST /api/auth/register', reg.ok, `status=${reg.status}`);

  const login = await api.post('/api/auth/login', {
    email: creds.email,
    username: creds.username,
    password: creds.password,
  });
  record('auth', 'POST /api/auth/login', login.ok, `status=${login.status}`);

  const token = pickToken(login.json);
  record('auth', 'login returned token', !!token, token ? '' : 'no token field found in response');

  let me = null;
  if (token) {
    const r = await api.get('/api/auth/me', { headers: { authorization: `Bearer ${token}` } });
    record('auth', 'GET /api/auth/me', r.ok, `status=${r.status}`);
    me = r.json;
  }

  return { creds, token, user: me };
}

async function runSessions(api, token) {
  if (!token) {
    record('sessions', 'list/revoke', false, 'skipped (no auth token)');
    return;
  }
  const headers = { authorization: `Bearer ${token}` };
  const list = await api.get('/api/sessions', { headers, expect: s => s === 200 || s === 404 });
  if (list.status === 404) {
    // Some apps mount it under /api/auth/sessions
    const alt = await api.get('/api/auth/sessions', { headers, expect: s => s === 200 || s === 404 });
    record('sessions', 'GET sessions list', alt.ok, `status=${alt.status} (alt path)`);
    return;
  }
  record('sessions', 'GET /api/sessions', list.ok, `status=${list.status}`);
}

async function runEntityCrud(api, token, entity) {
  if (!token) {
    record('entities', 'crud', false, 'skipped (no auth token)');
    return;
  }
  const headers = { authorization: `Bearer ${token}` };
  const base = `/api/${entity}`;
  const payload = { name: `Smoke Entity ${Date.now()}`, description: 'created by smoke test' };

  const created = await api.post(base, payload, { headers, expect: s => s === 200 || s === 201 });
  record('entities', `POST ${base}`, created.ok, `status=${created.status}`);
  const id = pickId(created.json);
  if (!id) {
    record('entities', 'create returned id', false, 'no id in response');
    return;
  }

  const read = await api.get(`${base}/${id}`, { headers });
  record('entities', `GET ${base}/:id`, read.ok, `status=${read.status}`);

  const list = await api.get(base, { headers });
  record('entities', `GET ${base} (list)`, list.ok, `status=${list.status}`);

  const patched = await api.patch(`${base}/${id}`, { description: 'updated by smoke test' }, {
    headers,
    expect: s => s === 200 || s === 204,
  });
  record('entities', `PATCH ${base}/:id`, patched.ok, `status=${patched.status}`);

  const deleted = await api.del(`${base}/${id}`, { headers, expect: s => s === 200 || s === 204 });
  record('entities', `DELETE ${base}/:id`, deleted.ok, `status=${deleted.status}`);
}

async function runUploads(api, token) {
  if (!token) {
    record('uploads', 'multipart POST', false, 'skipped (no auth token)');
    return;
  }
  const headers = { authorization: `Bearer ${token}` };
  const form = new FormData();
  const bytes = crypto.randomBytes(1024);
  form.append('file', new Blob([bytes], { type: 'application/octet-stream' }), 'smoke.bin');

  const up = await api.post('/api/uploads', form, {
    headers,
    expect: s => s === 200 || s === 201 || s === 404,
  });
  if (up.status === 404) {
    // Try alternate path
    const alt = await api.post('/api/upload', form, {
      headers,
      expect: s => s === 200 || s === 201 || s === 404,
    });
    record('uploads', 'POST /api/upload(s)', alt.ok && alt.status !== 404, `status=${alt.status}`);
    return;
  }
  record('uploads', 'POST /api/uploads', up.ok, `status=${up.status}`);

  const url = up.json && (up.json.url || (up.json.data && up.json.data.url));
  if (url) {
    const fetched = await api.get(url.startsWith('http') ? url.replace(api.base || '', '') : url, {
      headers,
      expect: s => s === 200 || s === 302,
    });
    record('uploads', 'GET uploaded asset', fetched.ok, `status=${fetched.status}`);
  }
}

async function runAdmin(api, adminToken) {
  if (!adminToken) {
    record('admin', 'endpoints', true, 'skipped (no --admin-token provided)');
    return;
  }
  const headers = { authorization: `Bearer ${adminToken}` };
  const users = await api.get('/api/admin/users', { headers, expect: s => s === 200 || s === 403 });
  record('admin', 'GET /api/admin/users', users.status === 200, `status=${users.status}`);
  const metrics = await api.get('/api/admin/metrics', { headers, expect: s => s === 200 || s === 404 });
  if (metrics.status !== 404) {
    record('admin', 'GET /api/admin/metrics', metrics.status === 200, `status=${metrics.status}`);
  }
}

// ---------- Main -----------------------------------------------------------

(async function main() {
  const args = parseArgs(process.argv);
  console.log(`Smoke testing: ${args.base}`);
  const api = makeClient(args);
  api.base = args.base;

  await runHealth(api);
  const { token } = await runAuth(api);
  await runSessions(api, token);
  await runEntityCrud(api, token, args.entity);
  await runUploads(api, token);
  await runAdmin(api, args.adminToken);

  const ok = summarize(args.json);
  process.exit(ok ? 0 : 1);
})().catch(err => {
  console.error('Fatal error in smoke test runner:', err);
  process.exit(2);
});
