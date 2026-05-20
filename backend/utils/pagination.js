/**
 * backend/utils/pagination.js
 *
 * Safe pagination helpers for the API.
 *
 * Two pagination strategies are exported:
 *   - offsetPagination(query, opts):   classic LIMIT/OFFSET, capped.
 *   - cursorPagination(query, opts):   keyset pagination on (sort_col, id).
 *
 * Both helpers enforce a hard maximum page size of 100 to prevent a client
 * from asking for a million rows. They also validate every input the
 * client controls, so they're safe to call with raw query params.
 *
 * For high-traffic list endpoints prefer cursorPagination — its query
 * cost is constant regardless of how deep the user scrolls, while
 * OFFSET grows linearly and becomes painful past page ~50.
 */

'use strict';

const HARD_MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

// ---------- helpers --------------------------------------------------------

function clampLimit(input) {
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, HARD_MAX_LIMIT);
}

function clampOffset(input) {
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  // Refuse to compute extreme offsets — they're almost always a bug or an
  // abuse vector. After ~10k rows, switch to cursor pagination.
  return Math.min(n, 10_000);
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* fall through */ }
  return null;
}

// ---------- offset pagination ---------------------------------------------

/**
 * @param {object} db - module exposing query(text, params)
 * @param {object} opts
 * @param {string} opts.sql           - SQL ending with a single placeholder
 *                                      for ORDER BY (use the `orderBy` field)
 * @param {Array}  opts.params        - SQL parameters
 * @param {string} opts.orderBy       - one-of an allowlist (validated)
 * @param {Array<string>} opts.allowedOrderBy - allowed column expressions
 * @param {string|number} opts.limit  - raw client input
 * @param {string|number} opts.offset - raw client input
 */
async function offsetPagination(db, opts) {
  const limit = clampLimit(opts.limit);
  const offset = clampOffset(opts.offset);
  const orderBy = validateOrderBy(opts.orderBy, opts.allowedOrderBy);

  const sql = `${opts.sql} ORDER BY ${orderBy} LIMIT $${opts.params.length + 1} OFFSET $${opts.params.length + 2}`;
  const params = [...opts.params, limit, offset];

  const res = await db.query(sql, params);
  return {
    items: res.rows,
    limit,
    offset,
    hasMore: res.rows.length === limit,
  };
}

// ---------- cursor pagination ---------------------------------------------

/**
 * Keyset pagination on (sortColumn, id). Generates a SQL `WHERE` clause
 * that filters strictly after the cursor's last row. Always includes the
 * primary key in the sort so the order is deterministic even when the
 * sort column has duplicates.
 *
 * @param {object} db
 * @param {object} opts
 * @param {string} opts.baseSql       - SQL up to and including any existing
 *                                      WHERE clause, ending with `AND` or
 *                                      empty WHERE-less query
 * @param {Array}  opts.params        - existing params
 * @param {string} opts.sortColumn    - allowlisted column name
 * @param {string} opts.sortDirection - 'asc' or 'desc'
 * @param {string} opts.idColumn      - default 'id'
 * @param {string|number} opts.limit
 * @param {string} opts.cursor        - opaque base64 cursor
 */
async function cursorPagination(db, opts) {
  const limit = clampLimit(opts.limit);
  const sortColumn = validateIdent(opts.sortColumn);
  const idColumn = validateIdent(opts.idColumn || 'id');
  const dir = (opts.sortDirection || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const cmp = dir === 'ASC' ? '>' : '<';

  const cursor = decodeCursor(opts.cursor);
  const params = [...opts.params];
  let whereClause = '';
  if (cursor && cursor.k !== undefined && cursor.i !== undefined) {
    // (sortCol, id) lexicographic compare; works for any sortable type.
    params.push(cursor.k, cursor.i);
    whereClause = ` (${sortColumn}, ${idColumn}) ${cmp} ($${params.length - 1}, $${params.length}) `;
  }

  // Compose: base [AND cursorClause] ORDER BY sortColumn DIR, id DIR LIMIT n
  const glue = opts.baseSql.match(/\bwhere\b/i) ? ' AND ' : ' WHERE ';
  const sql =
    `${opts.baseSql}${whereClause ? glue + whereClause : ''} ` +
    `ORDER BY ${sortColumn} ${dir}, ${idColumn} ${dir} ` +
    `LIMIT $${params.length + 1}`;
  params.push(limit + 1); // fetch one extra to know if there's another page

  const res = await db.query(sql, params);
  const hasMore = res.rows.length > limit;
  const items = hasMore ? res.rows.slice(0, limit) : res.rows;
  let nextCursor = null;
  if (hasMore) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor({ k: last[opts.sortColumn], i: last[opts.idColumn || 'id'] });
  }
  return { items, limit, nextCursor, hasMore };
}

// ---------- input validation ----------------------------------------------

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateIdent(name) {
  if (typeof name !== 'string' || !IDENT_RE.test(name)) {
    throw new Error(`invalid identifier: ${JSON.stringify(name)}`);
  }
  return name;
}

function validateOrderBy(orderBy, allowed) {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    throw new Error('allowedOrderBy must be a non-empty array');
  }
  // Accept "col" or "col desc" / "col asc"
  const normalized = String(orderBy || allowed[0]).trim().toLowerCase();
  const allowedNorm = allowed.map(s => s.toLowerCase());
  if (!allowedNorm.includes(normalized)) {
    throw new Error(`orderBy ${JSON.stringify(orderBy)} not in allowlist`);
  }
  return normalized;
}

module.exports = {
  HARD_MAX_LIMIT,
  DEFAULT_LIMIT,
  offsetPagination,
  cursorPagination,
  encodeCursor,
  decodeCursor,
};
