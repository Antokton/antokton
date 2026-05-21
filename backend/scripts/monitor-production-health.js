#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://antokton.com";
const DEFAULT_TIMEOUT_MS = 15000;

function parseArgs(argv) {
  const args = {
    base: process.env.ANTOKTON_MONITOR_BASE || DEFAULT_BASE_URL,
    expectDbMode: process.env.ANTOKTON_EXPECT_DB_MODE || "postgres",
    expectSchemas: Number(process.env.ANTOKTON_EXPECT_SCHEMAS || 60),
    timeoutMs: Number(process.env.ANTOKTON_MONITOR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--base" && next) {
      args.base = next;
      i += 1;
    } else if (arg === "--expect-db-mode" && next) {
      args.expectDbMode = next;
      i += 1;
    } else if (arg === "--expect-schemas" && next) {
      args.expectSchemas = Number(next);
      i += 1;
    } else if (arg === "--timeout-ms" && next) {
      args.timeoutMs = Number(next);
      i += 1;
    }
  }

  args.base = args.base.replace(/\/+$/, "");
  if (!Number.isFinite(args.expectSchemas)) args.expectSchemas = 60;
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) args.timeoutMs = DEFAULT_TIMEOUT_MS;
  return args;
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const started = Date.now();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "antokton-production-health-monitor/1.0"
      }
    });
    const elapsedMs = Date.now() - started;
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Keep json null; the caller will report a structured failure.
    }
    return { response, elapsedMs, json, text };
  } finally {
    clearTimeout(timeout);
  }
}

function assertHealth({ status, json }, args) {
  const failures = [];

  if (status !== 200) failures.push(`expected HTTP 200, got ${status}`);
  if (!json || json.ok !== true) failures.push("expected ok=true");
  if ((json?.dbMode || json?.db) !== args.expectDbMode) {
    failures.push(`expected dbMode=${args.expectDbMode}, got ${json?.dbMode || json?.db || "missing"}`);
  }
  if (Number(json?.schemas) !== args.expectSchemas) {
    failures.push(`expected schemas=${args.expectSchemas}, got ${json?.schemas ?? "missing"}`);
  }

  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = `${args.base}/health`;

  let result;
  try {
    result = await fetchJsonWithTimeout(url, args.timeoutMs);
  } catch (error) {
    const message = error.name === "AbortError"
      ? `timeout after ${args.timeoutMs}ms`
      : error.message;
    console.error(JSON.stringify({
      ok: false,
      url,
      error: message,
      checkedAt: new Date().toISOString()
    }));
    process.exit(2);
  }

  const status = result.response.status;
  const failures = assertHealth({ status, json: result.json }, args);
  const payload = {
    ok: failures.length === 0,
    url,
    status,
    elapsedMs: result.elapsedMs,
    dbMode: result.json?.dbMode || result.json?.db || null,
    schemas: result.json?.schemas ?? null,
    checkedAt: new Date().toISOString(),
    failures
  };

  console.log(JSON.stringify(payload));
  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message,
    checkedAt: new Date().toISOString()
  }));
  process.exit(2);
});
