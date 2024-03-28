import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  target: "esnext",
  bundle: true,
  shims: true,
  clean: true,
  dts: true
})
