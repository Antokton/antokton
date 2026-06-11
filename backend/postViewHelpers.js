function normalizeEmailValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function userEmailCandidates(user = {}) {
  return [
    user.email,
    user.user_email,
    user.contact_email,
    user.login_email,
    user.account_email,
    String(user.id || "").includes("@") ? user.id : "",
  ].map(normalizeEmailValue).filter(Boolean);
}

function isStaffRecord(user = {}) {
  const role = String(user?.role || "").toLowerCase();
  const category = String(user?.member_category || "").toLowerCase();
  return role === "admin" || role === "moderator" || category === "admin" || category === "staff" || category === "moderator";
}

function postAuthorEmails(post = {}) {
  return [
    post.created_by,
    post.author_email,
    post.importer_email,
    post.email,
    post.user_email,
    post.employer_email
  ].map(normalizeEmailValue).filter(Boolean);
}

function canSeePostViewStats(post = {}, viewer = {}) {
  if (!post || !viewer) return false;
  if (isStaffRecord(viewer)) return true;
  const viewerEmails = new Set(userEmailCandidates(viewer));
  return postAuthorEmails(post).some((email) => viewerEmails.has(email));
}

function postViewKey(view = {}) {
  return view.viewer_user_id
    ? `u:${normalizeEmailValue(view.viewer_user_id)}`
    : `s:${String(view.viewer_session_hash || "")}`;
}

function summarizePostViews(views = [], nowMs = Date.now()) {
  const dayAgo = nowMs - 24 * 60 * 60 * 1000;
  const weekAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
  const uniqueKeys = new Set();
  let viewsLast24h = 0;
  let viewsLast7d = 0;

  for (const view of views) {
    const key = postViewKey(view);
    if (key !== "s:") uniqueKeys.add(key);
    const createdAt = Date.parse(view.created_at || view.created_date || "");
    if (!Number.isFinite(createdAt)) continue;
    if (createdAt >= dayAgo) viewsLast24h += 1;
    if (createdAt >= weekAgo) viewsLast7d += 1;
  }

  return {
    view_count: uniqueKeys.size,
    total_views: views.length,
    unique_views: uniqueKeys.size,
    views_last_24h: viewsLast24h,
    views_last_7d: viewsLast7d
  };
}

function hasRecentPostView(views = [], dedupeKey = "", nowMs = Date.now()) {
  const cutoff = nowMs - 24 * 60 * 60 * 1000;
  return views.some((view) => {
    if (postViewKey(view) !== dedupeKey) return false;
    const createdMs = Date.parse(view.created_at || view.created_date || "");
    return Number.isFinite(createdMs) && createdMs >= cutoff;
  });
}

module.exports = {
  canSeePostViewStats,
  hasRecentPostView,
  isStaffRecord,
  postAuthorEmails,
  postViewKey,
  summarizePostViews,
  userEmailCandidates
};
