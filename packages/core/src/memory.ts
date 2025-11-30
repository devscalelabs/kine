import type {
	ChatCompletionAssistantMessageParam,
	ChatCompletionMessageParam,
	ChatCompletionToolMessageParam,
} from "openai/resources";

import type { Step } from "./types";

export interface BaseMemory {
	// Message management
	addMessage(
		role: "user" | "assistant" | "system",
		content: string,
		metadata?: Record<string, any>,
	): void;
	getMessages(): MemoryMessage[];
	getRecentMessages(count: number): MemoryMessage[];
	clearMessages(): void;

	// Step management
	addStep(step: Omit<Step, "meta">, stepNumber: number): void;
	getSteps(): MemoryStep[];
	getRecentSteps(count: number): MemoryStep[];
	clearSteps(): void;

	// Utility
	clearAll(): void;
	getStats(): Record<string, number>;

	// OpenAI tool calling format
	toOpenAIConversationHistory(): ChatCompletionMessageParam[];
}

export interface MemoryMessage {
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	metadata?: Record<string, any> | undefined;
}

export interface MemoryStep extends Step {
	timestamp: Date;
	stepNumber: number;
}

export interface MemoryConfig {
	maxMessages?: number;
	maxSteps?: number;
}

export class SimpleMemory implements BaseMemory {
	private messages: MemoryMessage[] = [];
	private steps: MemoryStep[] = [];
	private config: MemoryConfig;

	constructor(config: MemoryConfig = {}) {
		this.config = {
			maxMessages: 1000,
			maxSteps: 100,
			...config,
		};
	}

	addMessage(
		role: "user" | "assistant" | "system",
		content: string,
		metadata?: Record<string, any> | undefined,
	): void {
		const message: MemoryMessage = {
			role,
			content,
			timestamp: new Date(),
			metadata: metadata || undefined,
		};

		this.messages.push(message);

		// Enforce max messages limit
		if (this.messages.length > (this.config.maxMessages || 1000)) {
			this.messages = this.messages.slice(-(this.config.maxMessages || 1000));
		}
	}

	addStep(step: Omit<Step, "meta">, stepNumber: number): void {
		const memoryStep: MemoryStep = {
			...step,
			timestamp: new Date(),
			stepNumber,
			meta: { ctxSwitches: 0 },
		};

		this.steps.push(memoryStep);

		// Enforce max steps limit
		if (this.steps.length > (this.config.maxSteps || 100)) {
			this.steps = this.steps.slice(-(this.config.maxSteps || 100));
		}
	}

	getMessages(): MemoryMessage[] {
		return [...this.messages];
	}

	getSteps(): MemoryStep[] {
		return [...this.steps];
	}

	getRecentMessages(count: number): MemoryMessage[] {
		return this.messages.slice(-count);
	}

	getRecentSteps(count: number): MemoryStep[] {
		return this.steps.slice(-count);
	}

	clearMessages(): void {
		this.messages = [];
	}

	clearSteps(): void {
		this.steps = [];
	}

	clearAll(): void {
		this.messages = [];
		this.steps = [];
	}

	getStats(): {
		totalMessages: number;
		totalSteps: number;
		userMessages: number;
		assistantMessages: number;
		systemMessages: number;
		agentSteps: number;
		toolSteps: number;
		errorSteps: number;
	} {
		return {
			totalMessages: this.messages.length,
			totalSteps: this.steps.length,
			userMessages: this.messages.filter((msg) => msg.role === "user").length,
			assistantMessages: this.messages.filter((msg) => msg.role === "assistant")
				.length,
			systemMessages: this.messages.filter((msg) => msg.role === "system")
				.length,
			agentSteps: this.steps.filter((step) => step.type === "agent").length,
			toolSteps: this.steps.filter((step) => step.type === "tool").length,
			errorSteps: this.steps.filter((step) => step.type === "error").length,
		};
	}

	toConversationHistory(): ChatCompletionMessageParam[] {
		const history: ChatCompletionMessageParam[] = [];

		// Build chronological history by interleaving messages and steps
		let messageIndex = 0;
		let stepIndex = 0;

		// Add initial user message first
		if (this.messages.length > 0 && this.messages[0]?.role === "user") {
			history.push({
				role: "user",
				content: this.messages[0].content,
			});
			messageIndex++;
		}

		// Interleave steps and remaining messages in chronological order
		while (
			stepIndex < this.steps.length ||
			messageIndex < this.messages.length
		) {
			// Get next step or message based on timestamp
			const nextStep =
				stepIndex < this.steps.length ? this.steps[stepIndex] : undefined;
			const nextMessage =
				messageIndex < this.messages.length && this.messages[messageIndex]
					? this.messages[messageIndex]
					: undefined;

			if (
				nextStep &&
				nextMessage &&
				nextStep.timestamp &&
				nextMessage.timestamp
			) {
				// Compare timestamps to determine which comes first
				if (nextStep.timestamp <= nextMessage.timestamp) {
					// Add step first
					this.addStepToHistory(history, nextStep);
					stepIndex++;
				} else {
					// Add message first
					history.push({
						role: nextMessage.role as "user" | "assistant" | "system",
						content: nextMessage.content,
					});
					messageIndex++;
				}
			} else if (nextStep?.timestamp) {
				// Only steps remaining
				this.addStepToHistory(history, nextStep);
				stepIndex++;
			} else if (nextMessage?.timestamp) {
				// Only messages remaining
				history.push({
					role: nextMessage.role as "user" | "assistant" | "system",
					content: nextMessage.content,
				});
				messageIndex++;
			}
		}

		return history;
	}

	private addStepToHistory(
		history: ChatCompletionMessageParam[],
		step: MemoryStep,
	): void {
		if (step.type === "tool" && step.action && step.parameter) {
			// Tool call (assistant)
			const toolCallMessage: ChatCompletionAssistantMessageParam = {
				role: "assistant",
				content: null,
				tool_calls: [
					{
						id: `call_${step.stepNumber}`,
						type: "function",
						function: {
							name: step.action,
							arguments: JSON.stringify(step.parameter),
						},
					},
				],
			};
			history.push(toolCallMessage);

			// Tool result (tool role)
			const toolResultMessage: ChatCompletionToolMessageParam = {
				role: "tool",
				content:
					typeof step.result === "string"
						? step.result
						: JSON.stringify(step.result),
				tool_call_id: `call_${step.stepNumber}`,
			};
			history.push(toolResultMessage);
		}
	}

	stepsToConversationHistory(): Array<{
		role: "assistant" | "user";
		content: string;
	}> {
		const history: Array<{ role: "assistant" | "user"; content: string }> = [];

		for (const step of this.steps) {
			if (
				(step.type === "agent" ||
					step.type === "tool" ||
					step.type === "error") &&
				step.action
			) {
				let msg = `thought: ${step.content || ""}\naction: ${step.action}\n`;
				if (step.parameter) {
					msg += `parameter:\n${this.parameterToYAML(step.parameter)}\n`;
				}
				history.push({ role: "assistant", content: msg });
			}
			if (
				(step.type === "tool" ||
					step.type === "agent" ||
					step.type === "error") &&
				step.result !== undefined &&
				step.result !== "pending"
			) {
				history.push({
					role: "user",
					content: `observation:\n${JSON.stringify(step.result, null, 1)}`,
				});
			}
		}

		return history;
	}

	/**
	 * Convert steps to OpenAI tool calling format
	 */
	toOpenAIConversationHistory(): ChatCompletionMessageParam[] {
		// Now that toConversationHistory is chronological, we can just use it directly
		return this.toConversationHistory();
	}

	private parameterToYAML(p: any): string {
		if (typeof p === "object" && p !== null) {
			return Object.entries(p)
				.map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
				.join("\n");
		}
		return String(p);
	}
}
