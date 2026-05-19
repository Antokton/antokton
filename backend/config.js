const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_APP_ID = "6991d40eddf82cc25ec834a7";
const DEFAULT_DEV_USER_EMAIL = "admin@antokton.local";
const DEFAULT_MAX_REMOTE_ASSET_BYTES = 75 * 1024 * 1024;
const DEFAULT_AUTH_TOKEN_TTL_HOURS = 24 * 14;
const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function readString(name, defaultValue = "") {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value);
}

function readPort(name, defaultValue) {
  const raw = readString(name, String(defaultValue));
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

function readPositiveInteger(name, defaultValue) {
  const raw = readString(name, String(defaultValue));
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function readBoolean(name, defaultValue = false) {
  const raw = readString(name, String(defaultValue));
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function validateNodeEnv(value) {
  const allowed = new Set(["development", "test", "production"]);
  if (!allowed.has(value)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  return value;
}

function validateNonEmpty(name, value) {
  if (!value || !String(value).trim()) {
    throw new Error(`${name} must not be empty`);
  }
  return value;
}

function validateSingleLine(name, value) {
  if (/[\r\n\0]/.test(String(value))) {
    throw new Error(`${name} must be a single-line value`);
  }
  return value;
}

function validateDevEmail(value) {
  validateNonEmpty("ANTOKTON_DEV_USER_EMAIL", value);
  validateSingleLine("ANTOKTON_DEV_USER_EMAIL", value);
  if (!value.includes("@")) {
    throw new Error("ANTOKTON_DEV_USER_EMAIL must look like an email address");
  }
  return value;
}

const NODE_ENV = validateNodeEnv(readString("NODE_ENV", "development"));
const DATA_DIR = validateSingleLine("DATA_DIR", readString("DATA_DIR", path.join(__dirname, "data")));
const UPLOAD_DIR = validateSingleLine("UPLOAD_DIR", readString("UPLOAD_DIR", path.join(__dirname, "uploads")));
const DB_PATH = validateSingleLine("DB_PATH", readString("DB_PATH", path.join(DATA_DIR, "antokton.sqlite")));
const PORT = readPort("PORT", 8787);
const APP_ID = validateSingleLine("APP_ID", validateNonEmpty("APP_ID", readString("APP_ID", DEFAULT_APP_ID)));
const ANTOKTON_DEV_USER_EMAIL = validateDevEmail(readString("ANTOKTON_DEV_USER_EMAIL", DEFAULT_DEV_USER_EMAIL));
const MAX_REMOTE_ASSET_BYTES = readPositiveInteger("MAX_REMOTE_ASSET_BYTES", DEFAULT_MAX_REMOTE_ASSET_BYTES);
const STRIPE_PUBLISHABLE_KEY = validateSingleLine("STRIPE_PUBLISHABLE_KEY", readString("STRIPE_PUBLISHABLE_KEY", ""));
const STRIPE_SECRET_KEY = validateSingleLine("STRIPE_SECRET_KEY", readString("STRIPE_SECRET_KEY", ""));
const STRIPE_WEBHOOK_SECRET = validateSingleLine("STRIPE_WEBHOOK_SECRET", readString("STRIPE_WEBHOOK_SECRET", ""));
const STRIPE_FALLBACK_URL = validateSingleLine("STRIPE_FALLBACK_URL", readString("STRIPE_FALLBACK_URL", ""));
const ALLOW_DEV_AUTH = readBoolean("ALLOW_DEV_AUTH", NODE_ENV !== "production");
const AUTH_TOKEN_TTL_HOURS = readPositiveInteger("AUTH_TOKEN_TTL_HOURS", DEFAULT_AUTH_TOKEN_TTL_HOURS);
const AUTH_PASSWORD_MIN_LENGTH = readPositiveInteger("AUTH_PASSWORD_MIN_LENGTH", 10);
const AUTH_RATE_LIMIT_WINDOW_MS = readPositiveInteger("AUTH_RATE_LIMIT_WINDOW_MS", DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS);
const AUTH_LOGIN_RATE_LIMIT_MAX = readPositiveInteger("AUTH_LOGIN_RATE_LIMIT_MAX", 8);
const AUTH_REGISTER_RATE_LIMIT_MAX = readPositiveInteger("AUTH_REGISTER_RATE_LIMIT_MAX", 5);
const AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX = readPositiveInteger("AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX", 5);
const SESSION_COOKIE_NAME = validateSingleLine("SESSION_COOKIE_NAME", readString("SESSION_COOKIE_NAME", "antokton_session"));
const SESSION_COOKIE_SECURE = readBoolean("SESSION_COOKIE_SECURE", NODE_ENV === "production");
const AUTH_BOOTSTRAP_ADMIN_EMAIL = validateSingleLine("AUTH_BOOTSTRAP_ADMIN_EMAIL", readString("AUTH_BOOTSTRAP_ADMIN_EMAIL", ""));
const AUTH_BOOTSTRAP_ADMIN_PASSWORD = validateSingleLine("AUTH_BOOTSTRAP_ADMIN_PASSWORD", readString("AUTH_BOOTSTRAP_ADMIN_PASSWORD", ""));
const EXPORT_DIR = path.join(ROOT_DIR, "antokton-export");
const ANTOKTON_SCHEMA_DIR = path.join(EXPORT_DIR, "antokton-reference", "entities");
const LEGACY_SCHEMA_DIR = path.join(EXPORT_DIR, "base44", "entities");
const SCHEMA_DIR = fs.existsSync(ANTOKTON_SCHEMA_DIR) ? ANTOKTON_SCHEMA_DIR : LEGACY_SCHEMA_DIR;

const config = {
  NODE_ENV,
  ROOT_DIR,
  EXPORT_DIR,
  SCHEMA_DIR,
  LEGACY_SCHEMA_DIR,
  DATA_DIR,
  UPLOAD_DIR,
  REMOTE_ASSET_DIR: path.join(UPLOAD_DIR, "remote"),
  DB_PATH,
  PORT,
  APP_ID,
  ANTOKTON_DEV_USER_EMAIL,
  MAX_REMOTE_ASSET_BYTES,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_FALLBACK_URL,
  ALLOW_DEV_AUTH,
  AUTH_TOKEN_TTL_HOURS,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_LOGIN_RATE_LIMIT_MAX,
  AUTH_REGISTER_RATE_LIMIT_MAX,
  AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
  AUTH_BOOTSTRAP_ADMIN_EMAIL,
  AUTH_BOOTSTRAP_ADMIN_PASSWORD
};

function existsSafe(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function safeConfigStatus() {
  return {
    environment: config.NODE_ENV,
    port: config.PORT,
    database: {
      type: "sqlite",
      configured: Boolean(config.DB_PATH),
      directoryExists: existsSafe(path.dirname(config.DB_PATH)),
      fileExists: existsSafe(config.DB_PATH)
    },
    uploads: {
      configured: Boolean(config.UPLOAD_DIR),
      directoryExists: existsSafe(config.UPLOAD_DIR),
      remoteDirectoryExists: existsSafe(config.REMOTE_ASSET_DIR)
    },
    stripe: {
      publishableKeyConfigured: Boolean(config.STRIPE_PUBLISHABLE_KEY),
      secretKeyConfigured: Boolean(config.STRIPE_SECRET_KEY),
      webhookSecretConfigured: Boolean(config.STRIPE_WEBHOOK_SECRET),
      fallbackUrlConfigured: Boolean(config.STRIPE_FALLBACK_URL)
    },
    auth: {
      devAuthActive: config.NODE_ENV !== "production" && config.ALLOW_DEV_AUTH && Boolean(config.ANTOKTON_DEV_USER_EMAIL),
      passwordAuthConfigured: true,
      bootstrapAdminConfigured: Boolean(config.AUTH_BOOTSTRAP_ADMIN_EMAIL && config.AUTH_BOOTSTRAP_ADMIN_PASSWORD),
      tokenTtlHours: config.AUTH_TOKEN_TTL_HOURS,
      rateLimit: {
        mode: "in-memory",
        windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
        loginMax: config.AUTH_LOGIN_RATE_LIMIT_MAX,
        registerMax: config.AUTH_REGISTER_RATE_LIMIT_MAX,
        passwordChangeMax: config.AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX
      },
      sessionCookieConfigured: Boolean(config.SESSION_COOKIE_NAME),
      sessionCookieSecure: config.SESSION_COOKIE_SECURE
    }
  };
}

module.exports = {
  config,
  safeConfigStatus
};
