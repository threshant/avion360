const DEFAULT_COUNTRY_CODE = "91";

/** Strip to digits only (E.164 without +), defaulting India +91 for 10-digit numbers. */
export function normalizePhoneE164(
  phone: string,
  countryCode = DEFAULT_COUNTRY_CODE,
): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 10) {
    return `${countryCode}${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `${countryCode}${digits.slice(1)}`;
  }

  return digits;
}

/** Display format for Indian numbers: +91 XXXXX XXXXX */
export function formatPhoneDisplay(e164: string): string {
  const normalized = normalizePhoneE164(e164);
  if (normalized.length === 12 && normalized.startsWith("91")) {
    const local = normalized.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return normalized ? `+${normalized}` : "";
}

export function isValidIndianMobile(e164: string): boolean {
  const normalized = normalizePhoneE164(e164);
  return /^91[6-9]\d{9}$/.test(normalized);
}
