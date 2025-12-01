import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		agent: "src/agent.ts",
		tool: "src/tool.ts",
		memory: "src/memory.ts",
	},
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	splitting: false,
	minify: false,
	outExtension() {
		return {
			js: ".mjs",
			dts: ".d.mts",
		};
	},
	external: ["openai", "pino", "pino-pretty", "playwright", "yaml", "zod"],
});
