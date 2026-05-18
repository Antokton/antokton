const { config } = require("./config");

const buckets = new Map();
let lastPruneAt = 0;

function nowMs() {
  return Date.now();
}

function getClientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req?.socket?.remoteAddress || "unknown";
}

function normalizeIdentifier(identifier) {
  const clean = String(identifier || "anonymous").trim().toLowerCase();
  return clean.replace(/[^a-z0-9@._:-]/g, "_").slice(0, 180) || "anonymous";
}

function pruneExpiredBuckets(timestamp) {
  if (timestamp - lastPruneAt < config.AUTH_RATE_LIMIT_WINDOW_MS) return;
  lastPruneAt = timestamp;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= timestamp) buckets.delete(key);
  }
}

function getActionLimit(action) {
  switch (action) {
    case "login":
      return config.AUTH_LOGIN_RATE_LIMIT_MAX;
    case "register":
      return config.AUTH_REGISTER_RATE_LIMIT_MAX;
    case "change-password":
      return config.AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX;
    default:
      return config.AUTH_LOGIN_RATE_LIMIT_MAX;
  }
}

function consumeAuthRateLimit(action, req, identifier) {
  const timestamp = nowMs();
  pruneExpiredBuckets(timestamp);

  const windowMs = config.AUTH_RATE_LIMIT_WINDOW_MS;
  const maxAttempts = getActionLimit(action);
  const key = `${action}:${getClientIp(req)}:${normalizeIdentifier(identifier)}`;
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > timestamp
    ? existing
    : { count: 0, resetAt: timestamp + windowMs };

  if (bucket.count >= maxAttempts) {
    buckets.set(key, bucket);
    return {
      allowed: false,
      limit: maxAttempts,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000))
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: true,
    limit: maxAttempts,
    remaining: Math.max(0, maxAttempts - bucket.count),
    retryAfterSeconds: 0
  };
}

function getRateLimitStatus() {
  return {
    mode: "in-memory",
    windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
    loginMax: config.AUTH_LOGIN_RATE_LIMIT_MAX,
    registerMax: config.AUTH_REGISTER_RATE_LIMIT_MAX,
    passwordChangeMax: config.AUTH_PASSWORD_CHANGE_RATE_LIMIT_MAX
  };
}

module.exports = {
  consumeAuthRateLimit,
  getRateLimitStatus
};
