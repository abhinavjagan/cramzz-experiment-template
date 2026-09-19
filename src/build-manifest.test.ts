import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stampedExperimentManifest } from "./build-manifest";

describe("built experiment manifest", () => {
  it("keeps local builds explicitly unpinned", () => {
    assert.equal(stampedExperimentManifest(undefined).pinnedCommit, "UNPINNED");
    assert.equal(stampedExperimentManifest("  ").pinnedCommit, "UNPINNED");
  });

  it("stamps and normalizes the exact source commit", () => {
    assert.equal(
      stampedExperimentManifest("ABCDEF0123456789ABCDEF0123456789ABCDEF01").pinnedCommit,
      "abcdef0123456789abcdef0123456789abcdef01",
    );
  });

  it("rejects branches, abbreviations, and malformed commit references", () => {
    for (const value of ["main", "abc1234", "g".repeat(40), "a".repeat(41)]) {
      assert.throws(() => stampedExperimentManifest(value), /exact 40-character Git commit SHA/);
    }
  });
});
