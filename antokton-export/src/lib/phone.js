export const PHONE_PLACEHOLDER = "+00 00 000 000 000";

export function normalizeInternationalPhone(value = "") {
  return String(value).trim().replace(/[\s().-]/g, "");
}

export function isValidInternationalPhone(value = "", { required = false } = {}) {
  const normalized = normalizeInternationalPhone(value);
  if (!normalized) return !required;
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

export function getInternationalPhoneError(label = "Numri i telefonit") {
  return `${label} duhet të jetë në format ndërkombëtar E.164 dhe të fillojë me prefiksin +.`;
}
