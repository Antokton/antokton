const { config } = require("./config");

const usePostgres = config.DATABASE_PROVIDER === "postgres" || Boolean(config.DATABASE_URL);

if (usePostgres) {
  module.exports = require("./db-postgres");
} else {
  module.exports = require("./db-sqlite");
}
