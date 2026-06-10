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
const DATABASE_PROVIDER = readString("DATABASE_PROVIDER", "sqlite");
const DATABASE_URL = readString("DATABASE_URL", "");
const PORT = readPort("PORT", 8787);
const APP_ID = validateSingleLine("APP_ID", validateNonEmpty("APP_ID", readString("APP_ID", DEFAULT_APP_ID)));
const ANTOKTON_DEV_USER_EMAIL = validateDevEmail(readString("ANTOKTON_DEV_USER_EMAIL", DEFAULT_DEV_USER_EMAIL));
const MAX_REMOTE_ASSET_BYTES = readPositiveInteger("MAX_REMOTE_ASSET_BYTES", DEFAULT_MAX_REMOTE_ASSET_BYTES);
const STRIPE_PUBLISHABLE_KEY = validateSingleLine("STRIPE_PUBLISHABLE_KEY", readString("STRIPE_PUBLISHABLE_KEY", ""));
const STRIPE_SECRET_KEY = validateSingleLine("STRIPE_SECRET_KEY", readString("STRIPE_SECRET_KEY", ""));
const STRIPE_WEBHOOK_SECRET = validateSingleLine("STRIPE_WEBHOOK_SECRET", readString("STRIPE_WEBHOOK_SECRET", ""));
const STRIPE_FALLBACK_URL = validateSingleLine("STRIPE_FALLBACK_URL", readString("STRIPE_FALLBACK_URL", ""));
const SUPPORT_IBAN = validateSingleLine("SUPPORT_IBAN", readString("SUPPORT_IBAN", "BE97 9675 9290 1449"));
const SUPPORT_BANK_NAME = validateSingleLine("SUPPORT_BANK_NAME", readString("SUPPORT_BANK_NAME", ""));
const SUPPORT_PAYMENT_CONTACT = validateSingleLine("SUPPORT_PAYMENT_CONTACT", readString("SUPPORT_PAYMENT_CONTACT", ""));
const SUPPORT_ACCOUNT_HOLDER = validateSingleLine("SUPPORT_ACCOUNT_HOLDER", readString("SUPPORT_ACCOUNT_HOLDER", ""));
const SUPPORT_SHOW_ACCOUNT_HOLDER = readBoolean("SUPPORT_SHOW_ACCOUNT_HOLDER", false);
const SUPPORT_PAYMENT_REFERENCE = validateSingleLine("SUPPORT_PAYMENT_REFERENCE", readString("SUPPORT_PAYMENT_REFERENCE", ""));
const SUPPORT_TRANSPARENCY_NOTE = validateSingleLine("SUPPORT_TRANSPARENCY_NOTE", readString("SUPPORT_TRANSPARENCY_NOTE", ""));
const ALLOW_DEV_AUTH = readBoolean("ALLOW_DEV_AUTH", NODE_ENV !== "production");
const AUTH_TOKEN_TTL_HOURS = readPositiveInteger("AUTH_TOKEN_TTL_HOURS", DEFAULT_AUTH_TOKEN_TTL_HOURS);
const AUTH_PASSWORD_MIN_LENGTH = readPositiveInteger("AUTH_PASSWORD_MIN_LENGTH", 10);
const AUTH_RATE_LIMIT_WINDOW_MS = readPositiveInteger("AUTH_RATE_LIMIT_WINDOW_MS", DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS);
const AUTH_LOGIN_RATE_LIMIT_MAX = readPositiveInteger("AUTH_LOGIN_RATE_LIMIT_MAX", 8);
const AUTH_REGISTER_RATE_LIMIT_MAX = readPositiveInteger("AUTH_REGISTER_RATE_LIMIT_MAX", 5);
const AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX = readPositiveInteger("AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX", 5);
const AUTH_PASSWORD_RESET_TTL_MINUTES = readPositiveInteger("AUTH_PASSWORD_RESET_TTL_MINUTES", 60);
const SESSION_COOKIE_NAME = validateSingleLine("SESSION_COOKIE_NAME", readString("SESSION_COOKIE_NAME", "antokton_session"));
const SESSION_COOKIE_SECURE = readBoolean("SESSION_COOKIE_SECURE", NODE_ENV === "production");
const AUTH_BOOTSTRAP_ADMIN_EMAIL = validateSingleLine("AUTH_BOOTSTRAP_ADMIN_EMAIL", readString("AUTH_BOOTSTRAP_ADMIN_EMAIL", ""));
const AUTH_BOOTSTRAP_ADMIN_PASSWORD = validateSingleLine("AUTH_BOOTSTRAP_ADMIN_PASSWORD", readString("AUTH_BOOTSTRAP_ADMIN_PASSWORD", ""));
const APP_PUBLIC_URL = validateSingleLine("APP_PUBLIC_URL", readString("APP_PUBLIC_URL", ""));
const RESEND_API_KEY = validateSingleLine("RESEND_API_KEY", readString("RESEND_API_KEY", ""));
const EMAIL_FROM = validateSingleLine("EMAIL_FROM", readString("EMAIL_FROM", "Antokton <no-reply@antokton.com>"));
const SMTP_HOST = validateSingleLine("SMTP_HOST", readString("SMTP_HOST", ""));
const SMTP_PORT = readPort("SMTP_PORT", SMTP_HOST ? 587 : 587);
const SMTP_USER = validateSingleLine("SMTP_USER", readString("SMTP_USER", ""));
const SMTP_PASS = validateSingleLine("SMTP_PASS", readString("SMTP_PASS", ""));
const SMTP_SECURE = readBoolean("SMTP_SECURE", SMTP_PORT === 465);
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
  DATABASE_PROVIDER,
  DATABASE_URL,
  PORT,
  APP_ID,
  ANTOKTON_DEV_USER_EMAIL,
  MAX_REMOTE_ASSET_BYTES,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_FALLBACK_URL,
  SUPPORT_IBAN,
  SUPPORT_BANK_NAME,
  SUPPORT_PAYMENT_CONTACT,
  SUPPORT_ACCOUNT_HOLDER,
  SUPPORT_SHOW_ACCOUNT_HOLDER,
  SUPPORT_PAYMENT_REFERENCE,
  SUPPORT_TRANSPARENCY_NOTE,
  ALLOW_DEV_AUTH,
  AUTH_TOKEN_TTL_HOURS,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_LOGIN_RATE_LIMIT_MAX,
  AUTH_REGISTER_RATE_LIMIT_MAX,
  AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX,
  AUTH_PASSWORD_RESET_TTL_MINUTES,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
  AUTH_BOOTSTRAP_ADMIN_EMAIL,
  AUTH_BOOTSTRAP_ADMIN_PASSWORD,
  APP_PUBLIC_URL,
  RESEND_API_KEY,
  EMAIL_FROM,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE
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
      type: config.DATABASE_PROVIDER,
      configured: config.DATABASE_PROVIDER === "postgres" ? Boolean(config.DATABASE_URL) : Boolean(config.DB_PATH),
      directoryExists: config.DATABASE_PROVIDER === "postgres" ? true : existsSafe(path.dirname(config.DB_PATH)),
      fileExists: config.DATABASE_PROVIDER === "postgres" ? true : existsSafe(config.DB_PATH)
    },
    uploads: {
      configured: Boolean(config.UPLOAD_DIR),
      directoryExists: existsSafe(config.UPLOAD_DIR),
      remoteDirectoryExists: existsSafe(config.REMOTE_ASSET_DIR)
    },
    stripe: {
      checkoutConfigured: Boolean(config.STRIPE_SECRET_KEY),
      publishableKeyConfigured: Boolean(config.STRIPE_PUBLISHABLE_KEY),
      secretKeyConfigured: Boolean(config.STRIPE_SECRET_KEY),
      webhookSecretConfigured: Boolean(config.STRIPE_WEBHOOK_SECRET),
      fallbackUrlConfigured: Boolean(config.STRIPE_FALLBACK_URL),
      fallbackDeprecated: true
    },
    supportPayments: {
      supportPaymentConfigured: Boolean(config.SUPPORT_IBAN || config.SUPPORT_PAYMENT_CONTACT),
      supportIbanConfigured: Boolean(config.SUPPORT_IBAN),
      supportContactConfigured: Boolean(config.SUPPORT_PAYMENT_CONTACT),
      supportAccountHolderConfigured: Boolean(config.SUPPORT_ACCOUNT_HOLDER),
      supportAccountHolderPublic: Boolean(config.SUPPORT_SHOW_ACCOUNT_HOLDER && config.SUPPORT_ACCOUNT_HOLDER),
      supportReferenceConfigured: Boolean(config.SUPPORT_PAYMENT_REFERENCE),
      supportTransparencyNoteConfigured: Boolean(config.SUPPORT_TRANSPARENCY_NOTE)
    },
    auth: {
      devAuthActive: config.NODE_ENV !== "production" && config.ALLOW_DEV_AUTH && Boolean(config.ANTOKTON_DEV_USER_EMAIL),
      passwordAuthConfigured: true,
      bootstrapAdminConfigured: Boolean(config.AUTH_BOOTSTRAP_ADMIN_EMAIL && config.AUTH_BOOTSTRAP_ADMIN_PASSWORD),
      tokenTtlHours: config.AUTH_TOKEN_TTL_HOURS,
      passwordResetTtlMinutes: config.AUTH_PASSWORD_RESET_TTL_MINUTES,
      emailProviderConfigured: Boolean(config.RESEND_API_KEY || (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS)),
      emailProviders: {
        resend: Boolean(config.RESEND_API_KEY),
        smtp: Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS)
      },
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
