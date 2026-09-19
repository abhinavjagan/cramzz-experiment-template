import assert from "node:assert/strict";
import { describe, it } from "node:test";
import manifestJson from "../experiment.json";
import { parseManifest } from "./manifest";

describe("experiment manifest", () => {
  it("accepts the checked-in manifest", () => {
    assert.equal(parseManifest(manifestJson).slug, "example-experiment");
  });

  it("rejects repositories outside the personal experiment account", () => {
    assert.throws(
      () => parseManifest({ ...manifestJson, repository: "https://example.com/repo" }),
      /abhinavjagan/,
    );
  });

  it("rejects invalid calendar dates", () => {
    assert.throws(
      () => parseManifest({ ...manifestJson, launchDate: "2026-02-30" }),
      /ISO date/,
    );
  });

  it("keeps pre-launch and launched lifecycle dates consistent", () => {
    assert.throws(
      () => parseManifest({ ...manifestJson, status: "building", launchDate: "2026-09-20" }),
      /must keep launchDate null/,
    );
    assert.throws(
      () => parseManifest({ ...manifestJson, status: "testing", launchDate: null }),
      /require a launchDate/,
    );
    assert.equal(
      parseManifest({ ...manifestJson, status: "testing", launchDate: "2026-09-20" }).launchDate,
      "2026-09-20",
    );
  });

  it("rejects malformed sponsor inventory", () => {
    assert.throws(
      () =>
        parseManifest({
          ...manifestJson,
          sponsorInventory: [
            { id: "founding-node", label: "Founding Node", priceInr: -1, quantity: 20, status: "available" },
          ],
        }),
      /priceInr/,
    );
  });

  it("rejects unknown sponsor inventory fields", () => {
    assert.throws(
      () =>
        parseManifest({
          ...manifestJson,
          sponsorInventory: [
            {
              id: "founding-node",
              label: "Founding Node",
              priceInr: 499,
              quantity: 20,
              status: "available",
              paymentReference: "must-never-be-public",
            },
          ],
        }),
      /property paymentReference is not allowed/,
    );
  });
});
