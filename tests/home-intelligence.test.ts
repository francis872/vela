import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRootCause } from "../src/lib/root-cause-intelligence";

const start = new Date("2026-09-01T00:00:00.000Z");
function point(day: number, validation: number, velocity = 70) {
  return {
    capturedAt: new Date(start.getTime() + day * 86400000).toISOString(),
    velocity,
    validation,
    risk: 30,
    readiness: 55,
    sprintCompletion: 70,
  };
}

test("root cause identifies the earliest deteriorating metric", () => {
  const result = analyzeRootCause([
    point(0, 70),
    point(1, 60),
    point(2, 48, 68),
    point(3, 42, 60),
  ]);
  assert.equal(result.status, "AVAILABLE");
  assert.equal(result.primary?.label, "Validation Activity");
  assert.equal(result.primary?.direction, "DETERIORATING");
});

test("root cause refuses to infer from insufficient history", () => {
  const result = analyzeRootCause([point(0, 70), point(1, 65)]);
  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.equal(result.primary, null);
});
