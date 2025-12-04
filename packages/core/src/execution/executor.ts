import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";

import { SimpleMemory } from "../memory/memory";
import { Response } from "../response/response";
import { XMLResponseFormatter } from "../response/xml-response-formatter";
import { ToolManager } from "../tools/tool-manager";
import type {
	AgentRuntime,
	BaseMemory,
	MultimodalContent,
	Step,
	Tool,
} from "../types";
import { createDebugLogger } from "../utils/logger";

export interface ExecutorConfig {
	agentId: string;
	model: string;
	apiKey?: string | undefined;
	baseURL?: string | undefined;
	maxSteps?: number | undefined;
	memory?: BaseMemory | undefined;
	debug?: boolean | undefined;
}

export interface StepOutput {
	type: "agent" | "error" | "tool";
	content: string;
	action?: string;
	parameter?: any;
	result?: any;
	llmMetadata?: any;
}

export class Executor {
	private openai: OpenAI;
	private toolManager: ToolManager;
	private responseFormatter: XMLResponseFormatter;
	private memory: BaseMemory;
	private logger: ReturnType<typeof createDebugLogger>;
	private maxSteps: number;
	private model: string;
	private steps: Step[] = [];

	constructor(config: ExecutorConfig) {
		this.openai = new OpenAI({
			apiKey: config.apiKey ?? process.env.LLM_API_KEY,
			baseURL: config.baseURL ?? process.env.LLM_BASE_URL,
		});

		this.toolManager = new ToolManager(config.agentId, config.debug ?? false);
		this.responseFormatter = new XMLResponseFormatter();
		this.memory = config.memory || new SimpleMemory();
		this.logger = createDebugLogger(config.agentId, config.debug ?? false);
		this.maxSteps = config.maxSteps ?? 10;
		this.model = config.model;
		this.steps = [];
	}

	registerTool(tool: Tool): void {
		this.toolManager.registerTool(tool);
	}

	getToolsList(): string {
		return this.toolManager.getToolsList();
	}

	private convertMultimodalContentToString(
		content: string | MultimodalContent,
	): string {
		if (typeof content === "string") {
			return content;
		}

		// Handle the new format with text and images array
		if (content.text && content.images) {
			let result = content.text;
			if (content.images.length > 0) {
				result +=
					"\n\nImages:\n" +
					content.images.map((url, i) => `[Image ${i + 1}: ${url}]`).join("\n");
			}
			return result;
		}

		// Handle the old format with type field
		if (content.type === "text") {
			return content.text || "";
		}

		if (content.type === "image") {
			return `[Image: ${content.image_url?.url || "unknown"}]`;
		}

		// Fallback for text-only content
		if (content.text) {
			return content.text;
		}

		return String(content);
	}

	async execute(
		systemPrompt: string,
		prompt: string | MultimodalContent,
	): Promise<Response> {
		this.steps = [];
		const promptString = this.convertMultimodalContentToString(prompt);
		this.memory.addMessage("user", promptString);

		let finalResponse: string | null = null;

		while (this.steps.length < this.maxSteps) {
			const stepOutput = await this.executeStep(systemPrompt, promptString);
			this.addStep(stepOutput);

			if (stepOutput.action === "finalize") {
				finalResponse = stepOutput.result as string;
				break;
			}
		}

		if (!finalResponse) {
			this.logger.info(
				{ maxSteps: this.maxSteps },
				"Agent execution reached maximum step limit",
			);
			finalResponse = `Agent timed out (max ${this.maxSteps} steps).`;
		}

		this.memory.addMessage("assistant", finalResponse);

		const agentRuntime: AgentRuntime = {
			response: finalResponse,
			steps: this.steps,
		};

		return new Response(agentRuntime);
	}

	async *executeStreaming(
		systemPrompt: string,
		prompt: string | MultimodalContent,
	): AsyncGenerator<StepOutput, Response, unknown> {
		this.steps = [];
		const promptString = this.convertMultimodalContentToString(prompt);
		this.memory.addMessage("user", promptString);

		let finalResponse: string | null = null;

		while (this.steps.length < this.maxSteps) {
			const stepOutput = await this.executeStep(systemPrompt, promptString);
			this.addStep(stepOutput);

			const output: StepOutput = {
				type: stepOutput.type,
				content: stepOutput.content,
				result: stepOutput.result,
			};

			if (stepOutput.action) {
				output.action = stepOutput.action;
			}

			if (stepOutput.parameter !== undefined) {
				output.parameter = stepOutput.parameter;
			}

			yield output;

			if (stepOutput.action === "finalize") {
				finalResponse = stepOutput.result as string;
				break;
			}
		}

		if (!finalResponse) {
			this.logger.info(
				{ maxSteps: this.maxSteps },
				"Agent execution reached maximum step limit",
			);
			finalResponse = `Agent timed out (max ${this.maxSteps} steps).`;
		}

		this.memory.addMessage("assistant", finalResponse);

		const agentRuntime: AgentRuntime = {
			response: finalResponse,
			steps: this.steps,
		};

		return new Response(agentRuntime);
	}

	private async executeStep(
		systemPrompt: string,
		task: string,
	): Promise<StepOutput> {
		const messages = this.prepareMessages(systemPrompt, task);
		const llmResponse = await this.callLLM(messages);
		const stepOutput = this.parseAndValidateResponse(llmResponse);

		if (stepOutput.type === "tool" && stepOutput.action) {
			return await this.executeTool(stepOutput);
		}

		return stepOutput;
	}

	private prepareMessages(
		systemPrompt: string,
		task: string,
	): ChatCompletionMessageParam[] {
		const messages: ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: task },
		];

		const memoryHistory = this.memory.toConversationHistory();
		const filteredMemoryHistory = memoryHistory.filter(
			(msg) => !(msg.role === "user" && msg.content === task),
		);
		messages.splice(1, 0, ...filteredMemoryHistory);

		const stepHistory = this.memory.stepsToConversationHistory();
		for (const msg of stepHistory) {
			messages.push({
				role: msg.role,
				content: msg.content,
			});
		}

		return messages;
	}

	private async callLLM(
		messages: ChatCompletionMessageParam[],
	): Promise<{ content: string; metadata: any }> {
		const startTime = Date.now();
		const completion = await this.openai.chat.completions.create({
			messages,
			model: this.model,
		});
		const latency = Date.now() - startTime;

		const metadata = {
			latency,
			model: completion.model,
			tokens: completion.usage
				? {
						prompt_tokens: completion.usage.prompt_tokens,
						completion_tokens: completion.usage.completion_tokens,
						total_tokens: completion.usage.total_tokens,
					}
				: undefined,
			finish_reason: completion.choices[0]?.finish_reason,
		};

		this.logger.info(
			{
				llmResponse: completion.choices[0]?.message.content,
				model: completion.model,
			},
			"Received raw LLM response",
		);

		return {
			content: completion.choices[0]?.message.content ?? "",
			metadata,
		};
	}

	private parseAndValidateResponse(llmResponse: {
		content: string;
		metadata: any;
	}): StepOutput {
		try {
			const parsed = this.responseFormatter.parseResponse(llmResponse.content);

			this.logger.info(
				{ parsedAction: parsed.action },
				"Parsed LLM response action",
			);

			const validation = this.responseFormatter.validateResponse(parsed);
			if (!validation.isValid) {
				return this.responseFormatter.formatValidationError(
					validation.error!,
					parsed,
				);
			}

			if (parsed.action === "finalize") {
				return this.responseFormatter.formatFinalizeResponse(
					parsed,
					llmResponse.metadata,
				);
			}

			return this.responseFormatter.formatToolResponse(
				parsed,
				llmResponse.metadata,
			);
		} catch (error) {
			return this.responseFormatter.formatError(
				error instanceof Error ? error : String(error),
				"Invalid XML format",
			);
		}
	}

	private async executeTool(stepOutput: StepOutput): Promise<StepOutput> {
		if (!stepOutput.action) {
			return stepOutput;
		}

		const toolResult = await this.toolManager.executeTool(
			stepOutput.action,
			stepOutput.parameter,
		);

		if (toolResult.success) {
			return {
				...stepOutput,
				result: toolResult.result,
			};
		} else {
			const output: StepOutput = {
				type: "error",
				content: stepOutput.content,
				result: toolResult.error,
			};

			if (stepOutput.action) {
				output.action = stepOutput.action;
			}

			if (stepOutput.parameter !== undefined) {
				output.parameter = stepOutput.parameter;
			}

			if (stepOutput.llmMetadata) {
				output.llmMetadata = stepOutput.llmMetadata;
			}

			return output;
		}
	}

	private addStep(stepOutput: StepOutput): void {
		const step: Step = {
			type: stepOutput.type,
			content: stepOutput.content,
			result: stepOutput.result,
		};

		if (stepOutput.action !== undefined) {
			step.action = stepOutput.action;
		}

		if (stepOutput.parameter !== undefined) {
			step.parameter = stepOutput.parameter;
		}

		if (stepOutput.llmMetadata) {
			step.meta = {
				ctxSwitches: 0,
				tokens: stepOutput.llmMetadata.tokens,
				latency: stepOutput.llmMetadata.latency,
				model: stepOutput.llmMetadata.model,
				finish_reason: stepOutput.llmMetadata.finish_reason,
			};
		}

		this.steps.push(step);
		this.memory.addStep(step, this.steps.length);

		this.logger.info(
			{
				stepNumber: this.steps.length,
				action: stepOutput.action || "unknown",
				content: stepOutput.content,
			},
			"Agent step executed",
		);
	}
}
