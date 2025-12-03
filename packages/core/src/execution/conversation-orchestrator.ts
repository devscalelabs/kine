import logger from "../utils/logger";
import { StepsManager } from "../memory/steps";
import type { BaseMemory, Step } from "../types";
import type { StepOutput } from "../response/response-formatter";

export class ConversationOrchestrator {
	private stepsManager: StepsManager;
	private memory: BaseMemory | null;
	private debug: boolean;
	private agentId: string;

	constructor(
		agentId: string,
		maxSteps: number,
		memory: BaseMemory | null,
		debug: boolean = false,
	) {
		this.agentId = agentId;
		this.stepsManager = new StepsManager(maxSteps);
		this.memory = memory;
		this.debug = debug;
	}

	initialize(): void {
		this.stepsManager.initialize();
	}

	addStep(stepOutput: StepOutput): void {
		const stepData: Omit<Step, "meta"> = {
			type: stepOutput.type,
			content: stepOutput.content,
			result: stepOutput.result,
		};

		if (stepOutput.action !== undefined) {
			stepData.action = stepOutput.action;
		}

		if (stepOutput.parameter !== undefined) {
			stepData.parameter = stepOutput.parameter;
		}

		this.stepsManager.addStep(stepData, stepOutput.llmMetadata);

		if (this.memory) {
			const steps = this.stepsManager.getAllSteps();
			const lastStep = steps[steps.length - 1];
			if (lastStep) {
				this.memory.addStep(lastStep, this.stepsManager.getStepCount());
			}
		}

		if (this.debug) {
			logger.debug(
				`[${this.agentId}] Step ${this.stepsManager.getStepCount()}: ${
					stepOutput.action
				} - ${stepOutput.content}`,
			);
		}
	}

	getAllSteps(): Step[] {
		return this.stepsManager.getAllSteps();
	}

	getStepCount(): number {
		return this.stepsManager.getStepCount();
	}

	hasReachedMaxSteps(): boolean {
		return this.stepsManager.hasReachedMaxSteps();
	}

	getMaxSteps(): number {
		return this.stepsManager.getMaxSteps();
	}

	isEroded(stepOutput: StepOutput): boolean {
		return this.stepsManager.isEroded(stepOutput);
	}

	incrementContextSwitches(): void {
		this.stepsManager.incrementContextSwitches();
	}

	buildConversationHistory(): Array<{
		role: "assistant" | "user";
		content: string;
	}> {
		return this.stepsManager.buildConversationHistory();
	}

	addUserMessage(prompt: string): void {
		if (this.memory) {
			this.memory.addMessage("user", prompt);
		}
	}

	addAssistantMessage(response: string): void {
		if (this.memory) {
			this.memory.addMessage("assistant", response);
		}
	}

	getMemoryHistory(): import("openai/resources").ChatCompletionMessageParam[] {
		if (!this.memory) {
			return [];
		}
		return this.memory.toConversationHistory();
	}

	filterDuplicateMessages(messages: any[], currentTask: string): any[] {
		return messages.filter(
			(msg: any) => !(msg.role === "user" && msg.content === currentTask),
		);
	}

	logTimeout(): void {
		if (this.debug) {
			logger.debug(
				`[${this.agentId}] Timeout after ${this.stepsManager.getMaxSteps()} steps`,
			);
		}
	}

	logFinalization(result: string): void {
		if (this.debug) {
			logger.debug(`[${this.agentId}] Finalized: ${result}`);
		}
	}
}
