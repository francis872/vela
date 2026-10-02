import test from "node:test";
import assert from "node:assert/strict";
import { capabilitiesFor, hasCapability } from "../src/lib/capabilities";
import type { AccessContext } from "../src/lib/access-context";

function context(scope: "venture" | "organization", role: string): AccessContext {
  return {
    scope,
    scopeId: "scope-1",
    userId: "user-1",
    membership: scope === "venture"
      ? { kind: "venture", id: "member-1", role, status: "active" }
      : { kind: "organization", id: "member-1", role, status: "active" },
  };
}

test("unknown venture role is deny-by-default", () => {
  assert.deepEqual(capabilitiesFor(context("venture", "unknown-role")), []);
});

test("venture viewer is read-only", () => {
  const ctx = context("venture", "viewer");
  assert.equal(hasCapability(ctx, "venture.objectives.read"), true);
  assert.equal(hasCapability(ctx, "venture.objectives.write"), false);
  assert.equal(hasCapability(ctx, "venture.team.manage"), false);
});

test("venture owner can manage venture resources and team", () => {
  const ctx = context("venture", "owner");
  assert.equal(hasCapability(ctx, "venture.objectives.delete"), true);
  assert.equal(hasCapability(ctx, "venture.team.manage"), true);
});

test("organization viewer cannot manage members", () => {
  const ctx = context("organization", "viewer");
  assert.equal(hasCapability(ctx, "organization.portfolio.read"), true);
  assert.equal(hasCapability(ctx, "organization.members.manage"), false);
});

test("organization admin can manage members", () => {
  assert.equal(hasCapability(context("organization", "admin"), "organization.members.manage"), true);
});
