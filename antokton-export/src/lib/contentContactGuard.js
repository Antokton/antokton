const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const INTERNATIONAL_PHONE_PATTERN = /(?:\+|00)\s?\d(?:[\s().-]?\d){6,14}\b/;
const LOCAL_PHONE_PATTERN = /\b0\d(?:[\s().-]?\d){6,13}\b/;
const LONG_DIGIT_SEQUENCE_PATTERN = /\b(?:\d[\s().-]?){9,15}\b/;

export const CONTACT_IN_TEXT_MESSAGE =
  "Mos vendos numër telefoni ose email në tekstin e njoftimit. Numri i telefonit vendoset te fusha e telefonit, ndërsa emaili vendoset te fusha e emailit/kontaktit.";

export function findContactInfoInText(text = "") {
  const value = String(text || "");
  return {
    hasEmail: EMAIL_PATTERN.test(value),
    hasPhone:
      INTERNATIONAL_PHONE_PATTERN.test(value) ||
      LOCAL_PHONE_PATTERN.test(value) ||
      LONG_DIGIT_SEQUENCE_PATTERN.test(value),
  };
}

export function hasContactInfoInText(text = "") {
  const result = findContactInfoInText(text);
  return result.hasEmail || result.hasPhone;
}

export function getContactInfoInTextMessage(text = "") {
  const result = findContactInfoInText(text);
  if (result.hasEmail && result.hasPhone) return CONTACT_IN_TEXT_MESSAGE;
  if (result.hasPhone) return "Mos vendos numër telefoni në tekstin e njoftimit. Numri i telefonit vendoset te fusha e telefonit.";
  if (result.hasEmail) return "Mos vendos email në tekstin e njoftimit. Emaili vendoset te fusha e emailit/kontaktit.";
  return "";
}
