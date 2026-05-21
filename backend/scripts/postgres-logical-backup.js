#!/usr/bin/env node

/**
 * PostgreSQL logical backup runner.
 *
 * Designed for a Render Cron Job or a trusted operator shell. It never prints
 * the database URL and keeps dump artifacts out of the repository by default.
 */

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), ".backup-artifacts", "postgres");

function usage() {
  console.log(`Usage:
  node backend/scripts/postgres-logical-backup.js [--dry-run] [--json]

Environment:
  BACKUP_DATABASE_URL    PostgreSQL URL to back up. Falls back to DATABASE_URL.
  BACKUP_OUTPUT_DIR      Local working directory. Default: .backup-artifacts/postgres
  BACKUP_RETENTION_DAYS  Local artifact retention. Default: 14
  BACKUP_PREFIX          File prefix. Default: antokton-postgres
  PG_DUMP_BIN            pg_dump binary. Default: pg_dump

Optional S3/R2 upload:
  BACKUP_UPLOAD_PROVIDER Set to s3, or set BACKUP_S3_BUCKET.
  BACKUP_S3_BUCKET       Target bucket name.
  BACKUP_S3_PREFIX       Object prefix. Default: antokton/postgres
  BACKUP_S3_ENDPOINT     Optional S3-compatible endpoint, e.g. Cloudflare R2.
  BACKUP_AWS_CLI         AWS CLI binary. Default: aws
  AWS_ACCESS_KEY_ID      Storage access key, set in Render env only.
  AWS_SECRET_ACCESS_KEY  Storage secret key, set in Render env only.
  AWS_DEFAULT_REGION     AWS region, or auto for Cloudflare R2.

This script writes a custom-format pg_dump plus a .sha256 file. It does not
restore or validate the dump; run POSTGRESQL_RESTORE_DRILL_RUNBOOK.md after
scheduled backup setup.`);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    help: false
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function readConfig() {
  const uploadProvider = (process.env.BACKUP_UPLOAD_PROVIDER || (process.env.BACKUP_S3_BUCKET ? "s3" : "none")).toLowerCase();

  return {
    databaseUrl: process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL || "",
    outputDir: path.resolve(process.env.BACKUP_OUTPUT_DIR || DEFAULT_OUTPUT_DIR),
    retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 14),
    prefix: process.env.BACKUP_PREFIX || "antokton-postgres",
    pgDumpBin: process.env.PG_DUMP_BIN || "pg_dump",
    uploadProvider,
    s3Bucket: process.env.BACKUP_S3_BUCKET || process.env.S3_BUCKET_NAME || "",
    s3Prefix: process.env.BACKUP_S3_PREFIX || "antokton/postgres",
    s3Endpoint: process.env.BACKUP_S3_ENDPOINT || process.env.AWS_ENDPOINT_URL || "",
    awsCli: process.env.BACKUP_AWS_CLI || "aws"
  };
}

function validateConfig(config, dryRun) {
  const errors = [];

  if (!config.databaseUrl && !dryRun) errors.push("BACKUP_DATABASE_URL or DATABASE_URL is required.");
  if (!Number.isFinite(config.retentionDays) || config.retentionDays < 1) {
    errors.push("BACKUP_RETENTION_DAYS must be a positive number.");
  }
  if (!/^[a-z0-9._-]+$/i.test(config.prefix)) {
    errors.push("BACKUP_PREFIX may contain only letters, numbers, dots, underscores, and dashes.");
  }
  if (config.uploadProvider !== "none" && config.uploadProvider !== "s3") {
    errors.push("BACKUP_UPLOAD_PROVIDER must be none or s3.");
  }
  if (config.uploadProvider === "s3" && !config.s3Bucket) {
    errors.push("BACKUP_S3_BUCKET is required when S3/R2 upload is enabled.");
  }

  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.code = "CONFIG";
    throw error;
  }
}

function redact(value) {
  return String(value || "")
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgresql://[redacted]")
    .replace(/(password=)[^\s;]+/gi, "$1[redacted]")
    .replace(/(PGPASSWORD=)[^\s;]+/gi, "$1[redacted]");
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function connectionEnv(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const sslMode = parsed.searchParams.get("sslmode") || (/(render\.com|render\.internal)/i.test(parsed.hostname) ? "require" : "");

  return {
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    ...(sslMode ? { PGSSLMODE: sslMode } : {})
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        const error = new Error(`${command} exited with code ${code}: ${redact(stderr || stdout)}`);
        error.code = code;
        reject(error);
      }
    });
  });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function pruneOldBackups(outputDir, retentionDays) {
  if (!fs.existsSync(outputDir)) return [];
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const deleted = [];

  for (const entry of await fs.promises.readdir(outputDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(dump|sha256)$/.test(entry.name)) continue;
    const filePath = path.join(outputDir, entry.name);
    const stat = await fs.promises.stat(filePath);
    if (stat.mtimeMs >= cutoff) continue;
    await fs.promises.unlink(filePath);
    deleted.push(entry.name);
  }

  return deleted;
}

async function uploadToS3(config, dumpFile, shaFile) {
  const normalizedPrefix = config.s3Prefix.replace(/^\/+|\/+$/g, "");
  const targetBase = `s3://${config.s3Bucket}/${normalizedPrefix}`;
  const endpointArgs = config.s3Endpoint ? ["--endpoint-url", config.s3Endpoint] : [];

  for (const filePath of [dumpFile, shaFile]) {
    const objectUrl = `${targetBase}/${path.basename(filePath)}`;
    await run(config.awsCli, ["s3", "cp", filePath, objectUrl, ...endpointArgs]);
  }

  return {
    provider: "s3",
    bucket: config.s3Bucket,
    prefix: normalizedPrefix,
    endpoint: config.s3Endpoint ? "configured" : "aws-default"
  };
}

async function main() {
  const startedAt = Date.now();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const config = readConfig();
  validateConfig(config, args.dryRun);

  const fileBase = `${config.prefix}-${timestamp()}`;
  const dumpFile = path.join(config.outputDir, `${fileBase}.dump`);
  const shaFile = `${dumpFile}.sha256`;
  const summary = {
    ok: true,
    dryRun: args.dryRun,
    outputDir: config.outputDir,
    dumpFile,
    sha256File: shaFile,
    databaseUrlConfigured: Boolean(config.databaseUrl),
    uploadProvider: config.uploadProvider,
    uploaded: false,
    pruned: [],
    elapsedMs: 0
  };

  if (args.dryRun) {
    summary.elapsedMs = Date.now() - startedAt;
    console.log(args.json ? JSON.stringify(summary, null, 2) : `Dry run OK. Backup would write ${dumpFile}`);
    return;
  }

  await fs.promises.mkdir(config.outputDir, { recursive: true });
  await run(
    config.pgDumpBin,
    ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpFile],
    { env: connectionEnv(config.databaseUrl) }
  );

  const sha256 = await sha256File(dumpFile);
  await fs.promises.writeFile(shaFile, `${sha256}  ${path.basename(dumpFile)}${os.EOL}`, "utf8");

  const stat = await fs.promises.stat(dumpFile);
  summary.sha256 = sha256;
  summary.sizeBytes = stat.size;

  if (config.uploadProvider === "s3") {
    summary.upload = await uploadToS3(config, dumpFile, shaFile);
    summary.uploaded = true;
  }

  summary.pruned = await pruneOldBackups(config.outputDir, config.retentionDays);
  summary.elapsedMs = Date.now() - startedAt;

  console.log(args.json ? JSON.stringify(summary, null, 2) : `Backup OK. File: ${dumpFile}. SHA256: ${sha256}`);
}

main().catch((error) => {
  const message = redact(error && error.message ? error.message : error);
  console.error(`Backup failed: ${message}`);
  process.exit(error && error.code === "CONFIG" ? 2 : 1);
});
