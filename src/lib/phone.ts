import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type { CountryCode };

export const DEFAULT_PHONE_COUNTRY: CountryCode = "US";

export type ParsedPhone =
  | { ok: true; e164: string | null; country: CountryCode }
  | { ok: false; error: string };

const INVALID_MESSAGE =
  "Enter a valid phone number, like (555) 555-5555 or +44 20 7946 0958.";

/**
 * Blank stays blank (the field is optional). Anything typed must be a
 * possible number for its country; valid numbers come back in E.164 so
 * every country stores the same shape.
 */
export function parsePhoneNumber(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): ParsedPhone {
  const raw = (value ?? "").trim();
  if (!raw) return { ok: true, e164: null, country: defaultCountry };
  const phone = parsePhoneNumberFromString(raw, defaultCountry);
  if (!phone || !phone.isPossible()) return { ok: false, error: INVALID_MESSAGE };
  return { ok: true, e164: phone.number, country: phone.country ?? defaultCountry };
}

/**
 * Submit-time check from the picker's normalized value. Blank is fine;
 * anything else must have normalized to E.164 or the user sees the error.
 */
export function phoneSubmitError(display: string, e164: string | null): string | null {
  if (!display.trim()) return null;
  if (e164) {
    const check = parsePhoneNumber(e164);
    if (check.ok) return null;
  }
  return INVALID_MESSAGE;
}

/** Guess the country from a stored value so the picker opens in the right place. */
export function detectPhoneCountry(
  value: string | null | undefined,
  fallback: CountryCode = DEFAULT_PHONE_COUNTRY,
): CountryCode {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;
  const phone = parsePhoneNumberFromString(raw);
  return phone?.country ?? fallback;
}

/** Live formatting while typing; never throws half-typed input away. */
export function formatPhoneInput(
  value: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): string {
  if (!value.trim()) return "";
  return new AsYouType(country).input(value);
}

/** Display form of a stored value (E.164 or an old US format). */
export function displayPhoneNumber(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return formatPhoneInput(raw, detectPhoneCountry(raw));
}

export type CountryOption = { code: CountryCode; name: string; callingCode: string };

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

/** Every country the library knows, sorted by name, with calling codes. */
export function listPhoneCountries(): CountryOption[] {
  return getCountries()
    .map((code) => ({
      code,
      name: COUNTRY_NAMES.of(code) ?? code,
      callingCode: getCountryCallingCode(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
