const crypto = require("node:crypto");
const { config } = require("./config");
const { statements } = require("./db");

const TOKEN_PREFIX = "atk_";
const PASSWORD_HASH_VERSION = "scrypt";
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64
};

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function assertEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    const error = new Error("Valid email is required");
    error.status = 400;
    throw error;
  }
  return normalizedEmail;
}

function getBearerToken(req) {
  const header = req?.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function getClientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req?.socket?.remoteAddress || "";
}

function getUserAgent(req) {
  return String(req?.headers?.["user-agent"] || "").slice(0, 500);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function createOpaqueToken() {
  return `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: 64 * 1024 * 1024
  });
  return [
    PASSWORD_HASH_VERSION,
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt,
    derived.toString("base64url")
  ].join("$");
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 6 || parts[0] !== PASSWORD_HASH_VERSION) return false;

  const [, nRaw, rRaw, pRaw, salt, hash] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(String(password), salt, expected.length, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024
  });

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < config.AUTH_PASSWORD_MIN_LENGTH) {
    const error = new Error(`Password must be at least ${config.AUTH_PASSWORD_MIN_LENGTH} characters`);
    error.status = 400;
    throw error;
  }
}

function auditAuth(eventType, req, details = {}) {
  try {
    statements.insertAuthAuditLog.run(
      crypto.randomUUID(),
      eventType,
      details.email ? normalizeEmail(details.email) : null,
      details.accountId || null,
      getClientIp(req),
      getUserAgent(req),
      JSON.stringify(details.metadata || {}),
      now()
    );
  } catch (error) {
    console.warn(`Failed to write auth audit log: ${error.message}`);
  }
}

function getDevUserEmail() {
  return config.ANTOKTON_DEV_USER_EMAIL;
}

function isDevAuthActive() {
  return config.NODE_ENV !== "production" && config.ALLOW_DEV_AUTH && Boolean(getDevUserEmail());
}

function createDevAccessToken(email = getDevUserEmail()) {
  if (!isDevAuthActive()) {
    const error = new Error("Development auth is disabled");
    error.status = 403;
    throw error;
  }
  return `dev:${normalizeEmail(email)}`;
}

function getAuthAccountByEmail(email) {
  return statements.getAuthAccountByEmail.get(normalizeEmail(email)) || null;
}

function countAuthAccounts() {
  const row = statements.countAuthAccounts.get();
  return Number(row?.count || 0);
}

function createPasswordAccount({ email, password, user, req, status = "active", emailVerified = true }) {
  const normalizedEmail = assertEmail(email);
  assertPassword(password);

  if (getAuthAccountByEmail(normalizedEmail)) {
    const error = new Error("Account already exists");
    error.status = 409;
    throw error;
  }

  const timestamp = now();
  const account = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    user_record_id: user?.id || null,
    password_hash: hashPassword(password),
    status,
    email_verified_at: emailVerified ? timestamp : null,
    created_date: timestamp,
    updated_date: timestamp,
    last_login_at: null
  };

  statements.insertAuthAccount.run(
    account.id,
    account.email,
    account.user_record_id,
    account.password_hash,
    account.status,
    account.email_verified_at,
    account.created_date,
    account.updated_date,
    account.last_login_at
  );

  auditAuth("register", req, { email: normalizedEmail, accountId: account.id });
  return statements.getAuthAccountById.get(account.id);
}

function createSession(account, user, req) {
  const token = createOpaqueToken();
  const timestamp = now();
  const expiresAt = new Date(Date.now() + config.AUTH_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  statements.insertAuthSession.run(
    crypto.randomUUID(),
    account.id,
    user?.id || account.user_record_id || null,
    account.email,
    hashToken(token),
    timestamp,
    expiresAt,
    null,
    getUserAgent(req),
    getClientIp(req)
  );

  statements.updateAuthAccountLogin.run(user?.id || account.user_record_id || null, timestamp, timestamp, account.id);

  return {
    accessToken: token,
    tokenType: "Bearer",
    expiresAt
  };
}

function authenticatePassword({ email, password, req }) {
  const normalizedEmail = normalizeEmail(email);
  const account = getAuthAccountByEmail(normalizedEmail);

  if (!account || account.status !== "active" || !verifyPassword(password, account.password_hash)) {
    auditAuth("login_failed", req, { email: normalizedEmail });
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  auditAuth("login_success", req, { email: normalizedEmail, accountId: account.id });
  return account;
}

function setPasswordForAccount(account, password, req) {
  assertPassword(password);
  const timestamp = now();
  statements.updateAuthAccountPassword.run(hashPassword(password), timestamp, account.id);
  auditAuth("password_changed", req, { email: account.email, accountId: account.id, metadata: { source: "server" } });
  return statements.getAuthAccountById.get(account.id);
}

function getSessionAuth(token) {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;

  const session = statements.getAuthSessionByTokenHash.get(hashToken(token));
  if (!session || session.revoked_at) return null;
  if (Date.parse(session.expires_at) <= Date.now()) return null;

  const account = statements.getAuthAccountById.get(session.account_id);
  if (!account || account.status !== "active") return null;

  return {
    mode: "password",
    email: normalizeEmail(session.email),
    accountId: account.id,
    userRecordId: session.user_record_id || account.user_record_id || null
  };
}

function getRequestAuth(req) {
  const token = getBearerToken(req);

  if (token.startsWith("dev:")) {
    if (!isDevAuthActive()) return null;
    return {
      mode: "dev",
      email: normalizeEmail(token.slice(4)),
      accountId: null,
      userRecordId: null
    };
  }

  const sessionAuth = getSessionAuth(token);
  if (sessionAuth) return sessionAuth;

  if (!token && isDevAuthActive()) {
    return {
      mode: "dev",
      email: normalizeEmail(getDevUserEmail()),
      accountId: null,
      userRecordId: null
    };
  }

  return null;
}

function getRequestUserEmail(req) {
  return getRequestAuth(req)?.email || null;
}

function revokeRequestSession(req) {
  const token = getBearerToken(req);
  if (!token || !token.startsWith(TOKEN_PREFIX)) return false;
  statements.revokeAuthSession.run(now(), hashToken(token));
  return true;
}

function getAuthStatus() {
  const devAuthActive = isDevAuthActive();
  return {
    authMode: devAuthActive ? "password+dev" : "password",
    devAuthActive,
    passwordAuthActive: true,
    sessionTokenType: "opaque-bearer",
    authAccounts: countAuthAccounts(),
    bootstrapAdminConfigured: Boolean(config.AUTH_BOOTSTRAP_ADMIN_EMAIL && config.AUTH_BOOTSTRAP_ADMIN_PASSWORD)
  };
}

module.exports = {
  assertEmail,
  assertPassword,
  authenticatePassword,
  createDevAccessToken,
  createPasswordAccount,
  createSession,
  getAuthAccountByEmail,
  getAuthStatus,
  getDevUserEmail,
  getRequestAuth,
  getRequestUserEmail,
  hashPassword,
  isDevAuthActive,
  normalizeEmail,
  revokeRequestSession,
  setPasswordForAccount,
  verifyPassword
};
