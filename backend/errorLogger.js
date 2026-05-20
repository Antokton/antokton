/**
 * Centralized error logging middleware for Antokton
 * Logs errors to both stdout (Render logs) and local file (backend/logs/error.log)
 * Filters sensitive data (passwords, tokens, raw bodies)
 */

const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.join(__dirname, "logs");

// Ensure logs directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[errorLogger] Failed to create logs directory:", err.message);
}

/**
 * Format error for logging (filters sensitive data)
 */
function formatErrorLog(error, req, statusCode, userId = null) {
  const sanitized = {
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? "error" : "warn",
    statusCode,
    method: req.method,
    path: req.url,
    userId: userId || null,
    message: error?.message || String(error),
    errorType: error?.constructor?.name || "Error"
  };

  // Include stack trace only for 5xx errors and in non-production
  if (statusCode >= 500 && process.env.NODE_ENV !== "production") {
    sanitized.stack = error?.stack || null;
  }

  return sanitized;
}

/**
 * Safely write to log file without blocking
 */
function writeToFile(logEntry) {
  try {
    const logLine = JSON.stringify(logEntry) + "\n";
    const logPath = path.join(LOGS_DIR, "error.log");

    // Non-blocking append (ignore errors)
    fs.appendFile(logPath, logLine, (err) => {
      if (err) {
        console.warn(`[errorLogger] Failed to write to ${logPath}:`, err.message);
      }
    });
  } catch (err) {
    // Silent fail—don't crash on logging errors
    console.warn("[errorLogger] Unexpected error in writeToFile:", err.message);
  }
}

/**
 * Log error to stdout + file
 * Called from server error handler
 */
function logError(error, req, statusCode, userId = null) {
  try {
    const logEntry = formatErrorLog(error, req, statusCode, userId);

    // Write to stdout for Render logs
    if (statusCode >= 500) {
      console.error("[ERROR]", JSON.stringify(logEntry));
    } else {
      console.warn("[WARN]", JSON.stringify(logEntry));
    }

    // Write to file (non-blocking)
    writeToFile(logEntry);
  } catch (err) {
    console.error("[errorLogger] Critical error in logError:", err);
  }
}

/**
 * Get recent logs (for debugging/monitoring)
 * Returns last N lines from error.log
 */
function getRecentLogs(lines = 50) {
  try {
    const logPath = path.join(LOGS_DIR, "error.log");
    if (!fs.existsSync(logPath)) {
      return [];
    }

    const content = fs.readFileSync(logPath, "utf8");
    return content
      .split("\n")
      .filter((line) => line.trim())
      .slice(-lines)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      });
  } catch (err) {
    console.warn("[errorLogger] Failed to read logs:", err.message);
    return [];
  }
}

module.exports = {
  logError,
  getRecentLogs,
  formatErrorLog
};
