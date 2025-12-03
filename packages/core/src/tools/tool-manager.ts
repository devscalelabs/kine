import logger from "../utils/logger";
import { getToolMetadata } from "./tool";
import type { Tool } from "../types";

export class ToolManager {
	private tools: Map<string, Tool> = new Map();
	private debug: boolean;
	private agentId: string;

	constructor(agentId: string, debug: boolean = false) {
		this.agentId = agentId;
		this.debug = debug;
	}

	registerTool(tool: Tool): void {
		this.tools.set(tool.name, tool);

		if (this.debug) {
			logger.debug(`[${this.agentId}] Registered tool: ${tool.name}`);
		}

		const metadata = getToolMetadata(tool);
		if (this.debug) {
			logger.debug(
				`[${this.agentId}] Tool metadata: ${JSON.stringify(metadata)}`,
			);
		}
	}

	getTool(name: string): Tool | undefined {
		return this.tools.get(name);
	}

	hasTool(name: string): boolean {
		return this.tools.has(name);
	}

	getToolNames(): string[] {
		return Array.from(this.tools.keys());
	}

	getToolsList(): string {
		if (this.tools.size === 0) {
			return "No tools available. Use 'finalize' to answer.";
		}

		const toolDescriptions = Array.from(this.tools.values())
			.map((t) => {
				const metadata = getToolMetadata(t);
				return `  - ${t.name}: ${t.description}\n    Input example: ${metadata.inputExample}\n    Output example: ${metadata.outputExample}`;
			})
			.join("\n");

		return `Available tools:\n${toolDescriptions}\n  - finalize: End task and provide final answer`;
	}

	async executeTool(
		toolName: string,
		parameter: any,
	): Promise<{ success: boolean; result?: any; error?: string }> {
		const tool = this.tools.get(toolName);

		if (!tool) {
			return {
				success: false,
				error: `Tool not found: ${toolName}. Available: ${Array.from(this.tools.keys()).join(", ")}`,
			};
		}

		try {
			const validatedInput = tool.inputSchema.parse(parameter);
			const toolResult = await tool.execute(validatedInput);
			const validatedOutput = tool.outputSchema.parse(toolResult);

			return {
				success: true,
				result: validatedOutput,
			};
		} catch (error: any) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const validatedInput = tool.inputSchema.safeParse(parameter);

			return {
				success: false,
				error: `Tool execution failed: ${errorMessage}. Please try again with different parameters.`,
				result: validatedInput.success ? validatedInput.data : parameter,
			};
		}
	}
}
