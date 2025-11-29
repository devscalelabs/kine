import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { defineTool } from "./index";

export const readFileTool = defineTool({
	name: "read_file",
	description: "Read the contents of a file",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the file to read"),
	}),
	outputSchema: z.object({
		content: z.string(),
		exists: z.boolean(),
	}),
	execute: async ({ input }) => {
		try {
			if (!existsSync(input.path)) {
				return { content: "", exists: false };
			}
			const content = readFileSync(input.path, "utf-8");
			return { content, exists: true };
		} catch (error) {
			throw new Error(
				`Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});

export const writeFileTool = defineTool({
	name: "write_file",
	description: "Write content to a file (creates or overwrites)",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the file to write"),
		content: z.string().describe("Content to write to the file"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
	}),
	execute: async ({ input }) => {
		try {
			writeFileSync(input.path, input.content, "utf-8");
			return { success: true, message: "File written successfully" };
		} catch (error) {
			throw new Error(
				`Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});

export const listDirectoryTool = defineTool({
	name: "list_directory",
	description: "List files and directories in a given path",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to the directory to list"),
	}),
	outputSchema: z.object({
		items: z.array(
			z.object({
				name: z.string(),
				path: z.string(),
				isDirectory: z.boolean(),
				size: z.number(),
			}),
		),
	}),
	execute: async ({ input }) => {
		try {
			if (!existsSync(input.path)) {
				throw new Error("Directory does not exist");
			}
			const items = readdirSync(input.path).map((name) => {
				const fullPath = join(input.path, name);
				const stats = statSync(fullPath);
				return {
					name,
					path: fullPath,
					isDirectory: stats.isDirectory(),
					size: stats.size,
				};
			});
			return { items };
		} catch (error) {
			throw new Error(
				`Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});

export const fileExistsTool = defineTool({
	name: "file_exists",
	description: "Check if a file or directory exists",
	inputSchema: z.object({
		path: z.string().describe("Absolute path to check"),
	}),
	outputSchema: z.object({
		exists: z.boolean(),
		isDirectory: z.boolean(),
	}),
	execute: async ({ input }) => {
		try {
			const exists = existsSync(input.path);
			let isDirectory = false;
			if (exists) {
				isDirectory = statSync(input.path).isDirectory();
			}
			return { exists, isDirectory };
		} catch (_error) {
			return { exists: false, isDirectory: false };
		}
	},
});

export const searchInFilesTool = defineTool({
	name: "search_in_files",
	description: "Search for text pattern in files within a directory",
	inputSchema: z.object({
		directory: z.string().describe("Directory to search in"),
		pattern: z.string().describe("Text pattern to search for"),
		filePattern: z
			.string()
			.optional()
			.describe("File pattern to match (e.g., '*.ts', '*.js')"),
		caseSensitive: z
			.boolean()
			.default(false)
			.describe("Whether search should be case sensitive"),
	}),
	outputSchema: z.object({
		matches: z.array(
			z.object({
				file: z.string(),
				lineNumber: z.number(),
				line: z.string(),
			}),
		),
	}),
	execute: async ({ input }) => {
		try {
			const matches: Array<{
				file: string;
				lineNumber: number;
				line: string;
			}> = [];
			const searchFiles = (dir: string) => {
				if (!existsSync(dir)) return;

				const items = readdirSync(dir);
				for (const item of items) {
					const fullPath = join(dir, item);
					const stats = statSync(fullPath);

					if (stats.isDirectory()) {
						searchFiles(fullPath);
					} else if (stats.isFile()) {
						// Check file pattern if provided
						if (input.filePattern) {
							const regex = new RegExp(input.filePattern.replace(/\*/g, ".*"));
							if (!regex.test(item)) continue;
						}

						try {
							const content = readFileSync(fullPath, "utf-8");
							const lines = content.split("\n");
							const searchPattern = input.caseSensitive
								? input.pattern
								: input.pattern.toLowerCase();

							lines.forEach((line, index) => {
								const searchLine = input.caseSensitive
									? line
									: line.toLowerCase();
								if (searchLine.includes(searchPattern)) {
									matches.push({
										file: fullPath,
										lineNumber: index + 1,
										line: line.trim(),
									});
								}
							});
						} catch (_error) {
							// Skip files that can't be read
						}
					}
				}
			};

			searchFiles(input.directory);
			return { matches };
		} catch (error) {
			throw new Error(
				`Failed to search in files: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});
