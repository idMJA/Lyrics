import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"],
	outDir: "dist",
	sourcemap: false,
	minify: false,
	dts: true,
	clean: true,
});
