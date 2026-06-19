const genericRssProvider = require("./genericRssProvider");

async function fetchItems(options = {}) {
  const parserType = options.source?.parser_type || "rss";
  if (parserType === "rss") return genericRssProvider.fetchItems(options);
  return [];
}

module.exports = { fetchItems };
