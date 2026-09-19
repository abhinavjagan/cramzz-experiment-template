import { defineConfig, loadEnv } from "vite";
import { stampedExperimentManifest } from "./src/build-manifest";

export function normalizeBase(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "/") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "CRAMZZ_");

  return {
    base: normalizeBase(env.CRAMZZ_BASE_PATH ?? "/"),
    plugins: [{
      name: "stamp-experiment-manifest",
      apply: "build",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "experiment.json",
          source: `${JSON.stringify(stampedExperimentManifest(process.env.EXPERIMENT_SOURCE_COMMIT), null, 2)}\n`,
        });
      },
    }],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
