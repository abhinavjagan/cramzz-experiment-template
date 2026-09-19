import { defineConfig, loadEnv } from "vite";

export function normalizeBase(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "/") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "CRAMZZ_");

  return {
    base: normalizeBase(env.CRAMZZ_BASE_PATH ?? "/"),
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
