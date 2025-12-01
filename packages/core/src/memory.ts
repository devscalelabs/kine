import type {
	ChatCompletionAssistantMessageParam,
	ChatCompletionMessageParam,
	ChatCompletionToolMessageParam,
} from "openai/resources";

import type {
	BaseMemory,
	MemoryConfig,
	MemoryMessage,
	MemoryStep,
	Step,
} from "./types";

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

		if (this.messages.length > (this.config.maxMessages || 1000)) {
			this.messages = this.messages.slice(-(this.config.maxMessages || 1000));
		}
	}

	addStep(step: Step, stepNumber: number): void {
		const memoryStep: MemoryStep = {
			...step,
			timestamp: new Date(),
			stepNumber,
		};

		this.steps.push(memoryStep);

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

	getTokenUsage(): any {
		// Aggregate token usage from all steps that have metadata
		const stepsWithTokens = this.steps.filter((step) => step.meta?.tokens);
		if (stepsWithTokens.length === 0) {
			return {
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			};
		}

		return stepsWithTokens.reduce(
			(acc, step) => {
				const tokens = step.meta?.tokens;
				if (tokens) {
					acc.prompt_tokens += tokens.prompt_tokens || 0;
					acc.completion_tokens += tokens.completion_tokens || 0;
					acc.total_tokens += tokens.total_tokens || 0;
				}
				return acc;
			},
			{
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			},
		);
	}

	toConversationHistory(): ChatCompletionMessageParam[] {
		const history: ChatCompletionMessageParam[] = [];

		let messageIndex = 0;
		let stepIndex = 0;

		if (this.messages.length > 0 && this.messages[0]?.role === "user") {
			history.push({
				role: "user",
				content: this.messages[0].content,
			});
			messageIndex++;
		}

		while (
			stepIndex < this.steps.length ||
			messageIndex < this.messages.length
		) {
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
				if (nextStep.timestamp <= nextMessage.timestamp) {
					this.addStepToHistory(history, nextStep);
					stepIndex++;
				} else {
					history.push({
						role: nextMessage.role as "user" | "assistant" | "system",
						content: nextMessage.content,
					});
					messageIndex++;
				}
			} else if (nextStep?.timestamp) {
				this.addStepToHistory(history, nextStep);
				stepIndex++;
			} else if (nextMessage?.timestamp) {
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

	private parameterToYAML(p: any): string {
		if (typeof p === "object" && p !== null) {
			return Object.entries(p)
				.map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
				.join("\n");
		}
		return String(p);
	}
}
