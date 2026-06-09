export const EARLY_MEMBER_PREMIUM_UNTIL = "2026-08-01T00:00:00.000Z";

export function hasEarlyMemberPremiumAccess(user) {
  return Boolean(user?.email) && Date.now() < Date.parse(EARLY_MEMBER_PREMIUM_UNTIL);
}

export function hasPremiumAccess(user, hasActiveSubscription = false) {
  const role = String(user?.role || user?.member_category || "").toLowerCase();
  return Boolean(
    hasActiveSubscription ||
    hasEarlyMemberPremiumAccess(user) ||
    role === "admin" ||
    role === "moderator" ||
    role === "inspector"
  );
}
