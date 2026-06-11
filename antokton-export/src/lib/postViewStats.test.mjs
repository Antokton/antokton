import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  canSeePostViewStats,
  hasRecentPostView,
  summarizePostViews
} = require("../../../backend/postViewHelpers.js");

test("author can see post view stats", () => {
  const post = { created_by: "poster@example.com" };
  const viewer = { email: "poster@example.com", role: "user", member_category: "standard" };

  assert.equal(canSeePostViewStats(post, viewer), true);
});

test("admin and moderator can see post view stats for every post", () => {
  const post = { created_by: "poster@example.com" };

  assert.equal(canSeePostViewStats(post, { email: "admin@example.com", role: "admin" }), true);
  assert.equal(canSeePostViewStats(post, { email: "mod@example.com", role: "moderator" }), true);
});

test("regular users cannot see view stats for other people's posts", () => {
  const post = { created_by: "poster@example.com" };
  const viewer = { email: "reader@example.com", role: "user", member_category: "standard" };

  assert.equal(canSeePostViewStats(post, viewer), false);
});

test("post view summary counts total, unique, last 24h and last 7d", () => {
  const now = Date.parse("2026-06-11T12:00:00.000Z");
  const views = [
    { viewer_user_id: "reader@example.com", created_at: "2026-06-11T10:00:00.000Z" },
    { viewer_user_id: "reader@example.com", created_at: "2026-06-11T11:00:00.000Z" },
    { viewer_session_hash: "anon-1", created_at: "2026-06-10T10:00:00.000Z" },
    { viewer_session_hash: "anon-2", created_at: "2026-06-05T10:00:00.000Z" },
    { viewer_session_hash: "anon-old", created_at: "2026-05-01T10:00:00.000Z" }
  ];

  assert.deepEqual(summarizePostViews(views, now), {
    view_count: 4,
    total_views: 5,
    unique_views: 4,
    views_last_24h: 2,
    views_last_7d: 4
  });
});

test("post views are deduplicated for the same user or session within 24 hours", () => {
  const now = Date.parse("2026-06-11T12:00:00.000Z");
  const views = [
    { viewer_user_id: "reader@example.com", created_at: "2026-06-11T10:00:00.000Z" },
    { viewer_session_hash: "anon-1", created_at: "2026-06-09T10:00:00.000Z" }
  ];

  assert.equal(hasRecentPostView(views, "u:reader@example.com", now), true);
  assert.equal(hasRecentPostView(views, "s:anon-1", now), false);
});
