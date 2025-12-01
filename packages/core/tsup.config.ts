import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		agent: "src/agent.ts",
		tool: "src/tool.ts",
		memory: "src/memory.ts",
	},
	format: ["esm", "cjs"],
	dts: true,
	sourcemap: true,
	clean: true,
	splitting: false,
	minify: false,
	outExtension({ format }) {
		return {
			js: format === "esm" ? ".mjs" : ".js",
			dts: format === "esm" ? ".d.mts" : ".d.ts",
		};
	},
	external: ["openai", "pino", "pino-pretty", "playwright", "yaml", "zod"],
});
