import manifestJson from "../experiment.json";
import { parseManifest } from "./manifest";

export function stampedExperimentManifest(sourceCommit: string | undefined): Record<string, unknown> {
  const source = parseManifest(manifestJson);
  if (source.pinnedCommit !== "UNPINNED") {
    throw new Error("The checked-in template manifest must use the UNPINNED self-reference sentinel");
  }
  const requestedCommit = sourceCommit?.trim() || undefined;
  if (requestedCommit && !/^[0-9a-f]{40}$/i.test(requestedCommit)) {
    throw new Error("EXPERIMENT_SOURCE_COMMIT must be an exact 40-character Git commit SHA");
  }
  return {
    ...manifestJson,
    pinnedCommit: requestedCommit?.toLowerCase() ?? "UNPINNED",
  };
}
