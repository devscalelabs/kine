import type { ExecutionLoop } from "../execution/execution-loop";
import { AgentFactory } from "../factories/agent-factory";
import type { Response } from "../response/response";
import type { ToolManager } from "../tools/tool-manager";
import type { AgentConfig, AgentRuntime, Tool } from "../types";
import type { SystemPromptBuilder } from "../utils/system-prompt-builder";

export { Response } from "../response/response";

export class Agent {
	private executionLoop: ExecutionLoop;
	private systemPromptBuilder: SystemPromptBuilder;
	private toolManager: ToolManager;

	constructor(config: AgentConfig) {
		// Use internal factory to create all dependencies
		const dependencies = AgentFactory.createDependencies(config);

		// Assign dependencies
		this.executionLoop = dependencies.executionLoop;
		this.systemPromptBuilder = dependencies.systemPromptBuilder;
		this.toolManager = dependencies.toolManager;

		// Register tools from config
		if (config.tools) {
			for (const tool of config.tools) {
				this.registerTool(tool);
			}
		}
	}

	registerTool(tool: Tool): void {
		this.toolManager.registerTool(tool);
	}

	async run(prompt: string): Promise<Response> {
		const systemPrompt = this.buildSystemPrompt();
		return await this.executionLoop.execute(systemPrompt, prompt);
	}

	async *runStreaming(prompt: string): AsyncGenerator<
		{
			type: "agent" | "error" | "tool";
			content: string;
			action?: string;
			parameter?: any;
			result?: any;
		},
		Response,
		unknown
	> {
		const systemPrompt = this.buildSystemPrompt();
		const generator = this.executionLoop.executeStreaming(systemPrompt, prompt);

		// Collect all steps and yield them
		const steps: any[] = [];
		for await (const step of generator) {
			steps.push(step);
			yield step;
		}

		// After the generator is done, we need to get the final Response
		// The ExecutionLoop returns a Response when the generator completes
		const finalResult = await generator.next();
		if (finalResult.done && finalResult.value) {
			return finalResult.value as Response;
		}

		// Fallback: create Response from the last step if available
		if (steps.length > 0) {
			const lastStep = steps[steps.length - 1];
			if (lastStep.action === "finalize" && lastStep.result) {
				// Create a minimal Response object
				const { Response: ResponseClass } = await import(
					"../response/response"
				);
				const agentRuntime: AgentRuntime = {
					response: lastStep.result,
					steps: steps,
				};
				return new ResponseClass(agentRuntime);
			}
		}

		// Final fallback
		throw new Error("No final response available");
	}

	private buildSystemPrompt(): string {
		const toolsList = this.toolManager.getToolsList();
		return this.systemPromptBuilder.buildSystemPrompt(toolsList);
	}
}
