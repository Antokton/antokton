/**
 * backend/utils/batch-loader.js
 *
 * Per-request batch loader. The standard fix for N+1 query patterns where
 * a list of entities is fetched, then a related entity is loaded one row
 * at a time inside a loop.
 *
 * Inspired by the API of facebook/dataloader; reimplemented in ~80 lines
 * so we don't take on a runtime dependency.
 *
 * Usage:
 *   const userLoader = makeLoader(async (ids) => {
 *     const res = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
 *     // map by id, preserve input order, return undefined for misses
 *     const byId = new Map(res.rows.map(r => [r.id, r]));
 *     return ids.map(id => byId.get(id));
 *   });
 *
 *   const users = await Promise.all(orders.map(o => userLoader.load(o.user_id)));
 *   // → exactly one SQL query, regardless of orders.length.
 *
 * IMPORTANT: A loader caches results for its lifetime. Construct one per
 * HTTP request, not per process. See `attachLoaders` middleware below.
 */

'use strict';

function makeLoader(batchFn, { maxBatchSize = 100, cache = true } = {}) {
  let queue = []; // [{ key, resolve, reject }]
  const cacheMap = cache ? new Map() : null;

  async function dispatch() {
    const current = queue;
    queue = [];
    if (current.length === 0) return;

    // Deduplicate keys to minimize the batch payload.
    const seen = new Map();
    for (const { key } of current) {
      const k = serializeKey(key);
      if (!seen.has(k)) seen.set(k, key);
    }
    const uniqueKeys = [...seen.values()];

    // Honor maxBatchSize by chunking.
    const chunks = [];
    for (let i = 0; i < uniqueKeys.length; i += maxBatchSize) {
      chunks.push(uniqueKeys.slice(i, i + maxBatchSize));
    }
    const resultsByKey = new Map();
    for (const chunk of chunks) {
      try {
        const out = await batchFn(chunk);
        if (!Array.isArray(out) || out.length !== chunk.length) {
          throw new Error(`batchFn must return an array of length ${chunk.length}, got ${Array.isArray(out) ? out.length : typeof out}`);
        }
        chunk.forEach((k, i) => resultsByKey.set(serializeKey(k), { value: out[i] }));
      } catch (err) {
        chunk.forEach((k) => resultsByKey.set(serializeKey(k), { error: err }));
      }
    }

    for (const { key, resolve, reject } of current) {
      const slot = resultsByKey.get(serializeKey(key));
      if (slot.error) reject(slot.error);
      else resolve(slot.value);
    }
  }

  function load(key) {
    if (cacheMap) {
      const cached = cacheMap.get(serializeKey(key));
      if (cached) return cached;
    }
    const promise = new Promise((resolve, reject) => {
      queue.push({ key, resolve, reject });
      // schedule once per microtask tick
      if (queue.length === 1) queueMicrotask(dispatch);
    });
    if (cacheMap) cacheMap.set(serializeKey(key), promise);
    return promise;
  }

  function loadMany(keys) {
    return Promise.all(keys.map(load));
  }

  function clear(key) {
    if (cacheMap) cacheMap.delete(serializeKey(key));
  }

  function clearAll() {
    if (cacheMap) cacheMap.clear();
  }

  return { load, loadMany, clear, clearAll };
}

function serializeKey(key) {
  // Primitives stringify trivially; objects need a stable serialization.
  if (key === null || key === undefined) return String(key);
  if (typeof key !== 'object') return String(key);
  return JSON.stringify(key, Object.keys(key).sort());
}

/**
 * Express middleware: attach a fresh map of loaders to `req.loaders`.
 * Define your loader factory functions in `loaders/index.js`.
 *
 *   const { attachLoaders } = require('./utils/batch-loader');
 *   const loaders = require('./loaders');
 *   app.use(attachLoaders(loaders));
 *
 *   // route:
 *   const u = await req.loaders.userById.load(orderRow.user_id);
 */
function attachLoaders(factory) {
  return function loaderMiddleware(req, _res, next) {
    req.loaders = factory(req);
    next();
  };
}

module.exports = { makeLoader, attachLoaders };
