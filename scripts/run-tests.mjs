import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
const testFiles = (await readdir(sourceDirectory, { recursive: true }))
  .filter((path) => path.endsWith(".test.ts"))
  .sort()
  .map((path) => join(sourceDirectory, path));

if (testFiles.length === 0) {
  throw new Error("No test files found under src/");
}

const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", ...process.argv.slice(2), ...testFiles],
  { stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
