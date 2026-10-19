import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectPhoneCountry,
  displayPhoneNumber,
  formatPhoneInput,
  listPhoneCountries,
  parsePhoneNumber,
  phoneSubmitError,
} from "@/lib/phone";
import { parsePhoneField } from "@/lib/invoice-fields";

test("blank stays blank", () => {
  assert.deepEqual(parsePhoneNumber(""), { ok: true, e164: null, country: "US" });
  assert.deepEqual(parsePhoneNumber("   "), { ok: true, e164: null, country: "US" });
  assert.deepEqual(parsePhoneNumber(null), { ok: true, e164: null, country: "US" });
});

test("US numbers normalize to E.164", () => {
  assert.deepEqual(parsePhoneNumber("(555) 555-5555"), {
    ok: true,
    e164: "+15555555555",
    country: "US",
  });
  assert.deepEqual(parsePhoneNumber("+1 555 555 5555"), {
    ok: true,
    e164: "+15555555555",
    country: "US",
  });
});

test("foreign numbers keep their country", () => {
  assert.deepEqual(parsePhoneNumber("+44 20 7946 0958"), {
    ok: true,
    e164: "+442079460958",
    country: "GB",
  });
  assert.deepEqual(parsePhoneNumber("020 7946 0958", "GB"), {
    ok: true,
    e164: "+442079460958",
    country: "GB",
  });
});

test("half-typed input fails once submitted", () => {
  const result = parsePhoneNumber("(124) 3");
  assert.equal(result.ok, false);
  assert.match(
    (result as { error: string }).error,
    /valid phone number/,
  );
});

test("submit check allows blank and E.164, rejects the rest", () => {
  assert.equal(phoneSubmitError("", null), null);
  assert.equal(phoneSubmitError("+442079460958", "+442079460958"), null);
  assert.match(phoneSubmitError("(124) 3", null) ?? "", /valid phone number/);
});

test("server field stores E.164, rejects bad input", () => {
  assert.deepEqual(parsePhoneField(null), { ok: true, e164: null });
  assert.deepEqual(parsePhoneField(""), { ok: true, e164: null });
  assert.deepEqual(parsePhoneField("+442079460958"), { ok: true, e164: "+442079460958" });
  assert.deepEqual(parsePhoneField("(555) 555-5555"), { ok: true, e164: "+15555555555" });
  const bad = parsePhoneField("(124) 3");
  assert.equal(bad.ok, false);
});

test("nonsense fails", () => {
  for (const bad of ["abc", "+", "++1", "999"]) {
    assert.equal(parsePhoneNumber(bad).ok, false, bad);
  }
});

test("typing formats progressively without losing digits", () => {
  assert.equal(formatPhoneInput(""), "");
  assert.equal(formatPhoneInput("555", "US"), "(555)");
  assert.equal(formatPhoneInput("5555555555", "US"), "(555) 555-5555");
  assert.equal(formatPhoneInput("+442079460958", "GB"), "+44 20 7946 0958");
});

test("stored values display readably", () => {
  assert.equal(displayPhoneNumber("+15555555555"), "+1 555 555 5555");
  assert.equal(displayPhoneNumber("+442079460958"), "+44 20 7946 0958");
  assert.equal(displayPhoneNumber(""), "");
});

test("stored values reopen on the right country", () => {
  assert.equal(detectPhoneCountry("+442079460958"), "GB");
  assert.equal(detectPhoneCountry("(555) 555-5555"), "US");
  assert.equal(detectPhoneCountry(""), "US");
});

test("country list covers the world with calling codes", () => {
  const countries = listPhoneCountries();
  assert.ok(countries.length > 200);
  const us = countries.find((c) => c.code === "US");
  const gb = countries.find((c) => c.code === "GB");
  assert.equal(us?.callingCode, "1");
  assert.equal(gb?.callingCode, "44");
});
