# PostgreSQL Optimizations

Companion to `PRODUCTION_POSTGRES_ROLLOUT.md`. Describes the four changes
that ship with the cutover and the rationale behind each.

These changes are additive — none of them touch SQLite code paths, so the
SQLite production deployment is unaffected if `DB_MODE` is left at
`sqlite`.

---

## 1. Indexes

`backend/migrations/postgres/20260520_postgres_indexes.sql` creates an
index baseline. Highlights:

- **`users(LOWER(email))` UNIQUE** — login is case-insensitive, so the
  index must be too. Without it the login query falls back to a full
  table scan.
- **`sessions(token)` UNIQUE** and **`sessions(refresh_token)` UNIQUE
  WHERE refresh_token IS NOT NULL** — every authenticated request looks
  up by token; this turns it into an O(log n) operation.
- **`sessions(expires_at) WHERE revoked_at IS NULL`** — partial index
  used exclusively by the prune-expired-sessions cron. Keeps the index
  tiny.
- **`entities(user_id, updated_at DESC, id DESC)`** — composite index
  that exactly matches the default list endpoint's `WHERE user_id = $1
  ORDER BY updated_at DESC, id DESC` query, enabling an index-only scan
  with no sort step.
- **`entities USING GIN (metadata jsonb_path_ops)`** — GIN with
  `jsonb_path_ops` is ~30% smaller than the default and faster for the
  `@>` containment queries we use to filter by metadata.

All indexes are created `CONCURRENTLY` so they don't lock the table
during a production deploy. The migration must therefore be run outside
a transaction — use `psql -f` rather than the in-process migration
runner.

After creating the indexes, run `ANALYZE` on the affected tables (the
migration does this at the end). Without fresh statistics the planner
may not pick the new indexes.

---

## 2. Connection pooling

`backend/db/postgres.js` exposes a single shared `pg.Pool`. Tuning
defaults (overridable via env):

| Setting | Default | Why |
| --- | --- | --- |
| `PG_POOL_MAX` | 20 | Max concurrent connections per app instance. With 4 instances and Render's 100-connection cap on the Standard plan, leaves headroom for admin sessions. |
| `PG_POOL_MIN` | 2 | Keeps a couple of warm connections so the first request after a quiet period doesn't pay TLS handshake cost. |
| `PG_IDLE_TIMEOUT_MS` | 30 000 | Connections idle longer than this are closed, so a quiet hour returns capacity to the database. |
| `PG_CONNECTION_TIMEOUT_MS` | 5 000 | Bound on how long a checkout waits before failing fast. |
| `PG_STATEMENT_TIMEOUT_MS` | 30 000 | Applied as `SET statement_timeout` on every new connection. A runaway query kills itself rather than holding a pool slot. |
| `PG_IDLE_IN_TXN_TIMEOUT_MS` | 60 000 | Kills transactions left open by a hung request handler — these are the #1 cause of pool exhaustion. |
| `lock_timeout` | 10 s | A blocked migration gives up rather than queuing forever behind a long SELECT. |

The pool is constructed lazily (`getPool()`), so if `DB_MODE !==
'postgres'` no connection is ever opened. Importing the module is free.

A `transaction(fn)` helper exists so handlers do not have to remember
the `BEGIN/COMMIT/ROLLBACK` dance manually — that's the source of half
the long-lived transactions in any growing codebase.

When scaling past ~6 app instances, switch to PgBouncer in transaction
pooling mode in front of the database (see `PRODUCTION_POSTGRES_ROLLOUT.md`
§8). Set `PG_POOL_MAX` to a smaller per-app number once PgBouncer is in
place — the pooler does the multiplexing.

---

## 3. Pagination safety

`backend/utils/pagination.js` exports two helpers, both of which:

- Clamp `limit` to `[1, 100]`, defaulting to 25.
- Clamp `offset` to `[0, 10 000]` — deeper paging must use the cursor
  variant. This prevents a client from asking for OFFSET 5 000 000 and
  triggering a tens-of-second sequential scan.
- Validate every column name against an explicit allowlist before
  interpolating into SQL. Identifiers are not parameterizable in SQL, so
  the only safe approach is allowlisting.

`cursorPagination` uses keyset pagination on `(sortColumn, id)`. Its
cost is constant regardless of page depth and it's the only safe choice
for the activity feed and admin lists, where users routinely scroll past
1k rows.

Wire it into list endpoints like this:

```js
const { cursorPagination } = require('../utils/pagination');

router.get('/entities', async (req, res) => {
  const page = await cursorPagination(db, {
    baseSql: 'SELECT id, name, updated_at FROM entities WHERE user_id = $1',
    params: [req.user.id],
    sortColumn: 'updated_at',
    sortDirection: 'desc',
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  res.json(page);
});
```

---

## 4. N+1 protection

`backend/utils/batch-loader.js` is a small DataLoader-style batcher. The
typical pattern:

```js
// loaders/index.js
const { makeLoader } = require('../utils/batch-loader');
const db = require('../db/postgres');

module.exports = function loaders(/* req */) {
  return {
    userById: makeLoader(async (ids) => {
      const r = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
      const m = new Map(r.rows.map(u => [u.id, u]));
      return ids.map(id => m.get(id));
    }),
    entityById: makeLoader(async (ids) => {
      const r = await db.query('SELECT * FROM entities WHERE id = ANY($1)', [ids]);
      const m = new Map(r.rows.map(e => [e.id, e]));
      return ids.map(id => m.get(id));
    }),
  };
};
```

```js
// app.js
const loaders = require('./loaders');
const { attachLoaders } = require('./utils/batch-loader');
app.use(attachLoaders(loaders));
```

In a handler:

```js
const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [req.user.id]);
const owners = await Promise.all(
  orders.rows.map(o => req.loaders.userById.load(o.user_id))
);
// → 1 SELECT for orders, 1 SELECT for users — not N+1.
```

A loader instance caches results for its lifetime; constructing per-request
(via `attachLoaders`) is what keeps the cache from going stale. Never put
a loader in module scope.

---

## 5. Query patterns to avoid

A short list of mistakes that re-introduce the problems the indexes were
created to fix:

- `WHERE LOWER(email) = $1` is fine; `WHERE email ILIKE $1` is not
  index-friendly. Always lowercase the input first.
- `WHERE created_at::date = $1` casts the column on every row and skips
  the index. Use `created_at >= $1 AND created_at < $1 + INTERVAL '1 day'`.
- `SELECT *` on the activity feed pulls a JSONB blob you don't need; list
  the columns explicitly when the endpoint serves more than ~10 req/s.
- `count(*) OVER ()` to get a total alongside a page result triggers a
  full materialization. Either compute the count in a separate query
  (acceptable up to ~100k rows in the filtered set) or drop the count
  from the API and use cursor pagination.
- `IN (...)` lists longer than ~200 items defeat the planner. Use `=
  ANY($1::int[])` with an array parameter instead — it stays a single
  prepared statement.

---

## 6. Verifying the optimizations took effect

After the cutover, with traffic ramping up, sample the planner output
for the hot queries:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM sessions WHERE token = $1;
EXPLAIN (ANALYZE, BUFFERS)
  SELECT id, name, updated_at FROM entities
  WHERE user_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 25;
```

Expect to see `Index Scan` (or `Index Only Scan`) and a `Buffers` line
in the dozens, not thousands. If you see `Seq Scan` on either query,
either the index didn't get created or `ANALYZE` hasn't run on the
table yet.

For ongoing visibility enable the `pg_stat_statements` extension and add
a weekly review of the top-20-by-total-time queries to the engineering
on-call rotation.
