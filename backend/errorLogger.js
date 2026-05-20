const crypto = require("node:crypto");

function requestId(req) {
  const header = req?.headers?.["x-request-id"] || req?.headers?.["x-correlation-id"];
  if (header) return String(header).replace(/[\r\n\0]/g, "").slice(0, 120);
  return crypto.randomUUID();
}

function cleanMessage(error) {
  return String(error?.message || error || "Unknown error").replace(/[\r\n\0]/g, " ").slice(0, 500);
}

function logRequestError(error, req, context = {}) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const level = status >= 500 ? "error" : "warn";
  const payload = {
    ts: new Date().toISOString(),
    level,
    requestId: context.requestId || req?.requestId || null,
    method: req?.method || null,
    path: req?.url ? String(req.url).split("?")[0] : null,
    status,
    message: cleanMessage(error)
  };

  if (level === "error" && error?.stack) {
    payload.stack = String(error.stack).split("\n").slice(0, 6).join("\n");
  }

  console[level](JSON.stringify(payload));
}

module.exports = {
  logRequestError,
  requestId
};
