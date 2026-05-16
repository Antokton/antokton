const { config } = require("./config");

function getBearerToken(req) {
  const header = req?.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function getDevUserEmail() {
  return config.ANTOKTON_DEV_USER_EMAIL;
}

function getRequestUserEmail(req) {
  const token = getBearerToken(req);
  if (token.startsWith("dev:")) return token.slice(4);
  return getDevUserEmail();
}

function createDevAccessToken(email = getDevUserEmail()) {
  return `dev:${email}`;
}

function isDevAuthActive() {
  return Boolean(getDevUserEmail());
}

function getAuthStatus() {
  const devAuthActive = isDevAuthActive();
  return {
    authMode: devAuthActive ? "dev" : "production-not-configured",
    devAuthActive
  };
}

module.exports = {
  createDevAccessToken,
  getAuthStatus,
  getDevUserEmail,
  getRequestUserEmail,
  isDevAuthActive
};
