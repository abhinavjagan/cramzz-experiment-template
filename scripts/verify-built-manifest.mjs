import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../experiment.json", import.meta.url), "utf8"));
const built = JSON.parse(await readFile(new URL("../dist/experiment.json", import.meta.url), "utf8"));
const expectedCommit = process.env.EXPERIMENT_SOURCE_COMMIT?.trim().toLowerCase() || "UNPINNED";

assert.equal(source.pinnedCommit, "UNPINNED", "checked-in manifest must remain UNPINNED");
assert.match(expectedCommit, /^(UNPINNED|[0-9a-f]{40})$/, "expected commit is invalid");
assert.equal(built.pinnedCommit, expectedCommit, "built manifest has the wrong source commit");
assert.deepEqual(
  { ...built, pinnedCommit: "UNPINNED" },
  source,
  "built manifest drifted from the checked-in source",
);
console.log(`Built experiment manifest verified (${built.pinnedCommit}).`);
