import assert from "node:assert/strict";
import test from "node:test";
import { metricResult, normalizeNextToValidate } from "../src/lib/functional-contracts";

test("Validate coverage normalizes null and scalar recommendations to arrays", () => {
  assert.deepEqual(normalizeNextToValidate(null), []);
  assert.deepEqual(normalizeNextToValidate("objective-1"), ["objective-1"]);
  assert.deepEqual(normalizeNextToValidate(["objective-1"]), ["objective-1"]);
});

test("metrics distinguish legitimate zero from insufficient evidence", () => {
  const zero = metricResult(0, true, { label: "Completed Sprints", sampleSize: 2 });
  assert.equal(zero.status, "READY");
  assert.equal(zero.value, 0);

  const missing = metricResult(0, false, { label: "PMF Evidence", sampleSize: 0 });
  assert.equal(missing.status, "INSUFFICIENT_DATA");
  assert.equal(missing.value, null);
});
