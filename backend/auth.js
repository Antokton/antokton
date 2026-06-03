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

function parseCookies(req) {
  const header = String(req?.headers?.cookie || "");
  const cookies = {};
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    try {
      cookies[rawName] = decodeURIComponent(rawValue.join("=") || "");
    } catch {
      cookies[rawName] = rawValue.join("=") || "";
    }
  }
  return cookies;
}

function getBearerToken(req) {
  const header = req?.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function getAuthTokens(req) {
  const tokens = [];
  const bearerToken = getBearerToken(req);
  const cookieToken = parseCookies(req)[config.SESSION_COOKIE_NAME];

  for (const token of [bearerToken, cookieToken]) {
    if (token && !tokens.includes(token)) tokens.push(token);
  }

  return tokens;
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

async function auditAuth(eventType, req, details = {}) {
  try {
    await statements.insertAuthAuditLog.run(
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

async function getAuthAccountByEmail(email) {
  return (await statements.getAuthAccountByEmail.get(normalizeEmail(email))) || null;
}

function parseEntityRow(row) {
  if (!row) return null;
  try {
    const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
    return { id: row.id, ...data };
  } catch {
    return null;
  }
}

async function getUserRecordByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const rows = await statements.listEntity.all(config.APP_ID, "User");
  for (const row of rows) {
    const user = parseEntityRow(row);
    if (normalizeEmail(user?.email) === normalizedEmail) return user;
  }
  return null;
}

function futureDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now() ? new Date(time).toISOString() : "";
}

function assertUserCanAuthenticate(user) {
  if (!user) return;
  const blockedUntil = futureDate(user.blocked_until);
  const registrationBlockedUntil = futureDate(user.registration_block_until);
  const blocked =
    user.is_deleted ||
    user.blocked_permanently ||
    (user.is_blocked === true && String(user.status || "") !== "temporarily_blocked") ||
    (String(user.status || "").includes("blocked") && String(user.status || "") !== "temporarily_blocked") ||
    String(user.status || "") === "deleted";

  if (blocked || blockedUntil || registrationBlockedUntil) {
    const until = blockedUntil || registrationBlockedUntil;
    const error = new Error(
      until
        ? `Llogaria juaj është bllokuar/fshirë dhe nuk mund të përdoret deri më ${until.slice(0, 10)}.`
        : "Llogaria juaj është bllokuar ose fshirë nga administrata."
    );
    error.status = 403;
    throw error;
  }
}

async function assertRegistrationAllowed(email) {
  const user = await getUserRecordByEmail(email);
  const until = futureDate(user?.registration_block_until);
  if (until) {
    const error = new Error(`Llogaria juaj është bllokuar/fshirë dhe nuk mund të regjistroheni përsëri deri më ${until.slice(0, 10)}.`);
    error.status = 403;
    throw error;
  }
}

async function cleanupKnownTestAuthAccounts() {
  const result = {
    accountsDeleted: 0,
    sessionsDeleted: 0,
    auditLogsDeleted: 0
  };

  const accounts = await statements.listAuthAccountsByEmailLike.all("auth.beta.test.%@example.invalid");
  for (const account of accounts) {
    const sessions = await statements.deleteAuthSessionsByAccountOrEmail.run(account.id, account.email);
    const auditLogs = await statements.deleteAuthAuditLogsByAccountOrEmail.run(account.id, account.email);
    const deletedAccount = await statements.deleteAuthAccount.run(account.id);

    result.sessionsDeleted += sessions.changes || 0;
    result.auditLogsDeleted += auditLogs.changes || 0;
    result.accountsDeleted += deletedAccount.changes || 0;
  }

  return result;
}

async function countAuthAccounts() {
  const row = await statements.countAuthAccounts.get();
  return Number(row?.count || 0);
}

async function createPasswordAccount({ email, password, user, req, status = "active", emailVerified = true }) {
  const normalizedEmail = assertEmail(email);
  assertPassword(password);

  if (await getAuthAccountByEmail(normalizedEmail)) {
    const error = new Error("Account already exists");
    error.status = 409;
    throw error;
  }
  await assertRegistrationAllowed(normalizedEmail);

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

  await statements.insertAuthAccount.run(
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

  await auditAuth("register", req, { email: normalizedEmail, accountId: account.id });
  return statements.getAuthAccountById.get(account.id);
}

async function createSession(account, user, req) {
  const token = createOpaqueToken();
  const timestamp = now();
  const expiresAt = new Date(Date.now() + config.AUTH_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await statements.insertAuthSession.run(
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

  await statements.updateAuthAccountLogin.run(user?.id || account.user_record_id || null, timestamp, timestamp, account.id);

  return {
    accessToken: token,
    tokenType: "Bearer",
    expiresAt
  };
}

async function authenticatePassword({ email, password, req }) {
  const normalizedEmail = normalizeEmail(email);
  const account = await getAuthAccountByEmail(normalizedEmail);

  if (!account || account.status !== "active" || !verifyPassword(password, account.password_hash)) {
    await auditAuth("login_failed", req, { email: normalizedEmail });
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  assertUserCanAuthenticate(await getUserRecordByEmail(normalizedEmail));

  await auditAuth("login_success", req, { email: normalizedEmail, accountId: account.id });
  return account;
}

async function setPasswordForAccount(account, password, req) {
  assertPassword(password);
  const timestamp = now();
  await statements.updateAuthAccountPassword.run(hashPassword(password), timestamp, account.id);
  await auditAuth("password_changed", req, { email: account.email, accountId: account.id, metadata: { source: "server" } });
  return statements.getAuthAccountById.get(account.id);
}

async function getSessionAuth(token) {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;

  const session = await statements.getAuthSessionByTokenHash.get(hashToken(token));
  if (!session || session.revoked_at) return null;
  if (Date.parse(session.expires_at) <= Date.now()) return null;

  const account = await statements.getAuthAccountById.get(session.account_id);
  if (!account || account.status !== "active") return null;
  try {
    assertUserCanAuthenticate(await getUserRecordByEmail(session.email));
  } catch {
    return null;
  }

  return {
    mode: "password",
    email: normalizeEmail(session.email),
    accountId: account.id,
    userRecordId: session.user_record_id || account.user_record_id || null
  };
}

async function getRequestAuth(req) {
  const tokens = getAuthTokens(req);

  for (const token of tokens) {
    if (token.startsWith("dev:")) {
      if (!isDevAuthActive()) continue;
      return {
        mode: "dev",
        email: normalizeEmail(token.slice(4)),
        accountId: null,
        userRecordId: null
      };
    }

    const sessionAuth = await getSessionAuth(token);
    if (sessionAuth) return sessionAuth;
  }

  if (tokens.length === 0 && isDevAuthActive()) {
    return {
      mode: "dev",
      email: normalizeEmail(getDevUserEmail()),
      accountId: null,
      userRecordId: null
    };
  }

  return null;
}

async function getRequestUserEmail(req) {
  return (await getRequestAuth(req))?.email || null;
}

async function revokeRequestSession(req) {
  let revoked = false;
  for (const token of getAuthTokens(req)) {
    if (!token || !token.startsWith(TOKEN_PREFIX)) continue;
    await statements.revokeAuthSession.run(now(), hashToken(token));
    revoked = true;
  }
  return revoked;
}

async function getAuthStatus() {
  const devAuthActive = isDevAuthActive();
  return {
    authMode: devAuthActive ? "password+dev" : "password",
    devAuthActive,
    passwordAuthActive: true,
    sessionTokenType: "opaque-bearer",
    authAccounts: await countAuthAccounts(),
    bootstrapAdminConfigured: Boolean(config.AUTH_BOOTSTRAP_ADMIN_EMAIL && config.AUTH_BOOTSTRAP_ADMIN_PASSWORD)
  };
}

module.exports = {
  assertEmail,
  assertPassword,
  authenticatePassword,
  cleanupKnownTestAuthAccounts,
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
