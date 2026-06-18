export function getUserDisplayName(user, fallbackEmail = "") {
  if (!user) return "";
  const publicName = String(user.display_name || user.public_name || user.public_display_name || "").trim();
  if (publicName) return publicName;
  const fullName = String(user.full_name || "").trim();
  if (fullName) return fullName;
  const first = String(user.first_name || "").trim();
  const surname = String(user.surname || "").trim();
  if (first && surname) return `${first} ${surname}`;
  return first || "";
}

export function isStaffUser(user) {
  const role = String(user?.role || "").toLowerCase();
  const category = String(user?.member_category || "").toLowerCase();
  return ["admin", "moderator", "inspector", "superadmin"].includes(role) ||
    ["admin", "moderator", "staff", "superadmin"].includes(category);
}
