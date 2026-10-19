"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_PHONE_COUNTRY,
  detectPhoneCountry,
  formatPhoneInput,
  listPhoneCountries,
  parsePhoneNumber,
  type CountryCode,
} from "@/lib/phone";

type PhoneInputProps = {
  id: string;
  name: string;
  ariaLabel: string;
  value: string;
  /** Display text plus the normalized E.164 form (null while invalid). */
  onChange: (display: string, e164: string | null) => void;
  placeholder?: string;
  /** Set by the parent on submit; shown alongside the blur error. */
  externalError?: string | null;
  onBlurNotified?: () => void;
};

const COUNTRIES = listPhoneCountries();

/**
 * Optional phone field with a country-code picker. Blank is fine; once the
 * user types, the value must be a possible number for its country.
 */
export function PhoneInput({
  id,
  name,
  ariaLabel,
  value,
  onChange,
  placeholder = "(555) 555-5555",
  externalError,
  onBlurNotified,
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(() => detectPhoneCountry(value));
  const [touched, setTouched] = useState(false);

  const callingCode = useMemo(
    () => COUNTRIES.find((c) => c.code === country)?.callingCode ?? "1",
    [country],
  );

  function emit(formatted: string, region: CountryCode) {
    const parsed = parsePhoneNumber(formatted, region);
    onChange(formatted, parsed.ok ? parsed.e164 : null);
  }

  function handleInput(nextRaw: string) {
    // A pasted +44… number reseats the picker so it matches the digits.
    const region = nextRaw.trim().startsWith("+")
      ? detectPhoneCountry(nextRaw, country)
      : country;
    if (region !== country) setCountry(region);
    emit(formatPhoneInput(nextRaw, region), region);
  }

  function handleCountry(next: CountryCode) {
    setCountry(next);
    emit(formatPhoneInput(value, next), next);
  }

  const result = parsePhoneNumber(value, country);
  const blurError = touched && !result.ok ? result.error : null;
  const error = externalError ?? blurError;
  const errorId = `${id}-error`;
  // The form submits E.164, so region-specific digits never depend on who
  // parses them. Unparseable input submits raw and fails validation loudly.
  const submitted = result.ok && result.e164 ? result.e164 : value;

  return (
    <div>
      <input type="hidden" name={name} value={submitted} />
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          className="invoice-input w-28 shrink-0"
          value={country}
          onChange={(event) => handleCountry(event.target.value as CountryCode)}
        >
          {COUNTRIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} +{option.callingCode}
            </option>
          ))}
        </select>
        <input
          id={id}
          aria-label={ariaLabel}
          className="invoice-input min-w-0 flex-1"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => handleInput(event.target.value)}
          onBlur={() => {
            setTouched(true);
            onBlurNotified?.();
          }}
          placeholder={country === DEFAULT_PHONE_COUNTRY ? placeholder : `+${callingCode}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
