import { ConversationOrchestrator } from "../execution/conversation-orchestrator";
import { ExecutionLoop } from "../execution/execution-loop";
import { StepExecutor } from "../execution/step-executor";
import type { LLMProvider } from "../providers/llm-provider";
import { OpenAIProvider } from "../providers/openai-provider";
import type { Response } from "../response/response";
import type { ResponseFormatter } from "../response/response-formatter";
import { XMLResponseFormatter } from "../response/xml-response-formatter";
import { ToolManager } from "../tools/tool-manager";
import type { AgentConfig, AgentRuntime, Tool } from "../types";
import { SystemPromptBuilder } from "../utils/system-prompt-builder";

export { Response } from "../response/response";

export class Agent {
	protected config: AgentConfig;
	private llmProvider: LLMProvider;
	private responseFormatter: ResponseFormatter;
	private toolManager: ToolManager;
	private conversationOrchestrator: ConversationOrchestrator;
	private systemPromptBuilder: SystemPromptBuilder;
	private stepExecutor: StepExecutor;
	private executionLoop: ExecutionLoop;

	constructor(config: AgentConfig) {
		this.config = config;
		this.llmProvider = new OpenAIProvider(config.apiKey, config.baseURL);
		this.responseFormatter = new XMLResponseFormatter();
		this.toolManager = new ToolManager(config.id, config.debug ?? false);
		this.conversationOrchestrator = new ConversationOrchestrator(
			config.id,
			config.maxSteps ?? 10,
			config.memory || null,
			config.debug ?? false,
		);
		this.systemPromptBuilder = new SystemPromptBuilder(
			config.id,
			config.description,
		);
		this.stepExecutor = new StepExecutor(
			config.id,
			this.llmProvider,
			this.responseFormatter,
			this.toolManager,
			this.conversationOrchestrator,
			config.model,
			config.debug ?? false,
		);
		this.executionLoop = new ExecutionLoop(
			this.conversationOrchestrator,
			this.stepExecutor,
		);

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
