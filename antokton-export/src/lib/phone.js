export const PHONE_PLACEHOLDER = "+00 00 000 000 000";

export function normalizeInternationalPhone(value = "") {
  return String(value).trim().replace(/[\s().-]/g, "");
}

export function normalizePhoneForCountry(value = "", country = "", context = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  const locationText = `${country || ""} ${context || ""}`;
  const isGermany = /\b(gjermani|germany|deutschland)\b/i.test(locationText);
  if (isGermany && /^0\d{7,14}$/.test(digits)) {
    return `+49${digits.slice(1)}`;
  }

  return normalizeInternationalPhone(raw);
}

export function isValidInternationalPhone(value = "", { required = false } = {}) {
  const normalized = normalizeInternationalPhone(value);
  if (!normalized) return !required;
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

export function getInternationalPhoneError(label = "Numri i telefonit") {
  return `${label} duhet të jetë në format ndërkombëtar E.164 dhe të fillojë me prefiksin +.`;
}
