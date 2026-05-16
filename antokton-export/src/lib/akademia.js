import { base44 } from "@/api/antoktonClient";

export const courseStatusLabels = {
  draft: "Draft",
  active: "Aktiv",
  archived: "Arkivuar",
  completed: "Perfunduar"
};

export const applicationStatusLabels = {
  pending: "Ne pritje",
  approved: "Pranuar",
  rejected: "Refuzuar",
  completed: "Perfunduar"
};

export const applicationStatusClasses = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  completed: "bg-green-500/20 text-green-300 border-green-500/30"
};

export function displayName(user) {
  if (!user) return "";
  if (user.first_name && user.surname) return `${user.first_name} ${user.surname}`;
  return user.full_name || user.first_name || user.email?.split("@")[0] || user.email || "";
}

export function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed];
      } catch {
        // Fall back to line parsing.
      }
    }
    return trimmed.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  }
  return [value];
}

export function programToText(program) {
  return normalizeList(program).map((item, index) => {
    if (typeof item === "string") return item;
    const day = item.day || index + 1;
    const title = item.title || "";
    const description = item.description || "";
    return [day, title, description].filter(Boolean).join(" | ");
  }).join("\n");
}

export function textToProgram(text) {
  return normalizeList(text).map((line, index) => {
    const parts = String(line).split("|").map(part => part.trim());
    if (parts.length >= 3) {
      return {
        day: Number(parts[0]) || index + 1,
        title: parts[1],
        description: parts.slice(2).join(" | ")
      };
    }
    return {
      day: index + 1,
      title: `Dita ${index + 1}`,
      description: String(line)
    };
  });
}

export function textToLines(text) {
  return normalizeList(text).map(item => String(item));
}

export function formatMoney(price, currency = "EUR") {
  const amount = Number(price || 0);
  if (!amount) return "Falas";
  return `${amount.toLocaleString("sq-AL")} ${currency || "EUR"}`;
}

export function formatDate(value) {
  if (!value) return "Pa date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" });
}

export function isActiveCourse(course) {
  return (course?.status || "active") === "active";
}

export function userKeys(user) {
  return [user?.id, user?.email].filter(Boolean).map(String);
}

export function certificateUserKey(certificate) {
  return certificate?.user_id || certificate?.user_email || "";
}

export function isCertifiedUser(user, certificates = []) {
  const keys = new Set(userKeys(user));
  return certificates.some(cert =>
    cert.status === "valid" &&
    (keys.has(cert.user_id) || keys.has(cert.user_email) || keys.has(certificateUserKey(cert)))
  );
}

export function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `AA-${year}-${time}${random}`;
}

export async function issueAkademiaCertificate({ application, course, evaluation, issuerEmail }) {
  if (!application || !course) throw new Error("Mungon aplikimi ose kursi");

  const existing = await base44.entities.AkademiaCertificate.list("-created_date", 1000);
  const current = existing.find(cert =>
    cert.status === "valid" &&
    (cert.application_id === application.id ||
      (cert.course_id === course.id &&
        (cert.user_id === application.user_id || cert.user_email === application.user_email)))
  );
  if (current) return current;

  const certificate = await base44.entities.AkademiaCertificate.create({
    certificate_number: generateCertificateNumber(),
    user_id: application.user_id,
    user_email: application.user_email,
    user_name: application.user_name,
    course_id: course.id,
    course_title: course.title,
    application_id: application.id,
    evaluation_id: evaluation?.id,
    issue_date: new Date().toISOString().slice(0, 10),
    issued_by: issuerEmail,
    status: "valid"
  });

  await base44.entities.AkademiaApplication.update(application.id, { status: "completed" });

  try {
    if (application.user_id || application.user_email) {
      await base44.entities.User.update(application.user_id || application.user_email, {
        academy_certified: true,
        academy_certified_at: new Date().toISOString(),
        academy_last_certificate_number: certificate.certificate_number
      });
    }
  } catch {
    // The certificate is the source of truth; profile enrichment is best effort.
  }

  return certificate;
}
