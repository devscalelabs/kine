import { Executor } from "../execution/executor";
import { SimpleMemory } from "../memory/memory";
import type { Response } from "../response/response";
import type { AgentConfig, Tool } from "../types";
import { SystemPromptBuilder } from "../utils/system-prompt-builder";

export { Response } from "../response/response";

export class Agent {
	private executor: Executor;
	private systemPromptBuilder: SystemPromptBuilder;

	constructor(config: AgentConfig) {
		this.executor = new Executor({
			agentId: config.id,
			model: config.model,
			apiKey: config.apiKey,
			baseURL: config.baseURL,
			maxSteps: config.maxSteps,
			memory: config.memory || new SimpleMemory(),
			debug: config.debug,
		});

		this.systemPromptBuilder = new SystemPromptBuilder(
			config.id,
			config.description,
		);

		if (config.tools) {
			for (const tool of config.tools) {
				this.registerTool(tool);
			}
		}
	}

	registerTool(tool: Tool): void {
		this.executor.registerTool(tool);
	}

	async run(prompt: string): Promise<Response> {
		const systemPrompt = this.buildSystemPrompt();
		return await this.executor.execute(systemPrompt, prompt);
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
		const generator = this.executor.executeStreaming(systemPrompt, prompt);

		const steps: any[] = [];
		for await (const step of generator) {
			steps.push(step);
			yield step;
		}

		const finalResult = await generator.next();
		if (finalResult.done && finalResult.value) {
			return finalResult.value as Response;
		}

		if (steps.length > 0) {
			const lastStep = steps[steps.length - 1];
			if (lastStep.action === "finalize" && lastStep.result) {
				const { Response: ResponseClass } = await import(
					"../response/response"
				);
				const agentRuntime = {
					response: lastStep.result,
					steps: steps,
				};
				return new ResponseClass(agentRuntime);
			}
		}

		throw new Error("No final response available");
	}

	private buildSystemPrompt(): string {
		const toolsList = this.executor.getToolsList();
		return this.systemPromptBuilder.buildSystemPrompt(toolsList);
	}
}
