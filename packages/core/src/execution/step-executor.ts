import logger from "../utils/logger";
import type { LLMProvider, LLMMessage } from "../providers/llm-provider";
import type { ResponseFormatter, StepOutput } from "../response/response-formatter";
import type { ToolManager } from "../tools/tool-manager";
import type { ConversationOrchestrator } from "./conversation-orchestrator";

export class StepExecutor {
	private llmProvider: LLMProvider;
	private responseFormatter: ResponseFormatter;
	private toolManager: ToolManager;
	private conversationOrchestrator: ConversationOrchestrator;
	private model: string;
	private debug: boolean;
	private agentId: string;

	constructor(
		agentId: string,
		llmProvider: LLMProvider,
		responseFormatter: ResponseFormatter,
		toolManager: ToolManager,
		conversationOrchestrator: ConversationOrchestrator,
		model: string,
		debug: boolean = false,
	) {
		this.agentId = agentId;
		this.llmProvider = llmProvider;
		this.responseFormatter = responseFormatter;
		this.toolManager = toolManager;
		this.conversationOrchestrator = conversationOrchestrator;
		this.model = model;
		this.debug = debug;
	}

	async executeStep(systemPrompt: string, task: string): Promise<StepOutput> {
		const messages = this.prepareMessages(systemPrompt, task);
		const llmResponse = await this.callLLM(messages);
		const stepOutput = this.parseAndValidateResponse(llmResponse);

		if (stepOutput.type === "tool" && stepOutput.action) {
			return await this.executeTool(stepOutput);
		}

		return stepOutput;
	}

	private prepareMessages(systemPrompt: string, task: string): LLMMessage[] {
		const messages: LLMMessage[] = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: task },
		];

		const memoryHistory = this.conversationOrchestrator.getMemoryHistory();
		const filteredMemoryHistory =
			this.conversationOrchestrator.filterDuplicateMessages(
				memoryHistory,
				task,
			);
		messages.splice(1, 0, ...filteredMemoryHistory);

		const history = this.conversationOrchestrator.buildConversationHistory();
		messages.push(...history);

		return messages;
	}

	private async callLLM(
		messages: LLMMessage[],
	): Promise<{ content: string; metadata: any }> {
		const startTime = Date.now();
		const response = await this.llmProvider.chatCompletion(
			messages,
			this.model,
		);
		const latency = Date.now() - startTime;

		const metadata = {
			latency,
			model: response.model,
			tokens: response.usage,
			finish_reason: response.finish_reason,
		};

		if (this.debug) {
			logger.debug(`[${this.agentId}] Raw LLM response: ${response.content}`);
		}

		return { content: response.content, metadata };
	}

	private parseAndValidateResponse(llmResponse: {
		content: string;
		metadata: any;
	}): StepOutput {
		try {
			const parsed = this.responseFormatter.parseResponse(llmResponse.content);

			if (this.debug) {
				logger.debug(`[${this.agentId}] LLM response: action=${parsed.action}`);
			}

			const validation = this.responseFormatter.validateResponse(parsed);
			if (!validation.isValid) {
				const xmlFormatter = this.responseFormatter as any;
				if (xmlFormatter.formatValidationError) {
					return xmlFormatter.formatValidationError(validation.error!, parsed);
				}
				return this.responseFormatter.formatError(
					validation.error!,
					parsed.thought || "Validation error",
				);
			}

			if (parsed.action === "finalize") {
				const xmlFormatter = this.responseFormatter as any;
				if (xmlFormatter.formatFinalizeResponse) {
					return xmlFormatter.formatFinalizeResponse(
						parsed,
						llmResponse.metadata,
					);
				}
				return {
					type: "agent",
					content: parsed.thought || "",
					action: "finalize",
					parameter: parsed.parameter,
					result: parsed.finalAnswer,
					llmMetadata: llmResponse.metadata,
				};
			}

			const xmlFormatter = this.responseFormatter as any;
			if (xmlFormatter.formatToolResponse) {
				return xmlFormatter.formatToolResponse(parsed, llmResponse.metadata);
			}

			const output: StepOutput = {
				type: "tool",
				content: parsed.thought || "",
				result: "pending",
				llmMetadata: llmResponse.metadata,
			};

			if (parsed.action) {
				output.action = parsed.action;
			}

			if (parsed.parameter !== undefined) {
				output.parameter = parsed.parameter;
			}

			return output;
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
}
