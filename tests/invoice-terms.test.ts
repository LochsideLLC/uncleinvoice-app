import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PAYMENT_TERMS,
  PAYMENT_TERMS,
  dueDateFromTerms,
  resolveDefaultTerms,
} from "@/lib/invoice-fields";

test("built-in fallback is a real preset", () => {
  assert.ok((PAYMENT_TERMS as readonly string[]).includes(DEFAULT_PAYMENT_TERMS));
});

test("resolveDefaultTerms prefers the saved default", () => {
  assert.equal(resolveDefaultTerms("Net 15"), "Net 15");
  assert.equal(resolveDefaultTerms("  Net 45  "), "Net 45");
});

test("resolveDefaultTerms falls back when nothing saved", () => {
  assert.equal(resolveDefaultTerms(null), DEFAULT_PAYMENT_TERMS);
  assert.equal(resolveDefaultTerms(undefined), DEFAULT_PAYMENT_TERMS);
  assert.equal(resolveDefaultTerms(""), DEFAULT_PAYMENT_TERMS);
  assert.equal(resolveDefaultTerms("   "), DEFAULT_PAYMENT_TERMS);
});

test("dueDateFromTerms derives dates from presets", () => {
  const issue = new Date("2026-04-01T12:00:00");
  assert.equal(dueDateFromTerms(issue, "Due on receipt")?.toISOString().slice(0, 10), "2026-04-01");
  assert.equal(dueDateFromTerms(issue, "Net 30")?.toISOString().slice(0, 10), "2026-05-01");
  assert.equal(dueDateFromTerms(issue, null), null);
  assert.equal(dueDateFromTerms(issue, "Custom text"), null);
});
