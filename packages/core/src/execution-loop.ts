import { MetadataAggregator } from "./metadata";
import { Response } from "./response";
import type { AgentRuntime } from "./types";
import type { StepOutput } from "./response-formatter";
import type { ConversationOrchestrator } from "./conversation-orchestrator";
import type { StepExecutor } from "./step-executor";

export class ExecutionLoop {
	private conversationOrchestrator: ConversationOrchestrator;
	private stepExecutor: StepExecutor;

	constructor(
		conversationOrchestrator: ConversationOrchestrator,
		stepExecutor: StepExecutor,
	) {
		this.conversationOrchestrator = conversationOrchestrator;
		this.stepExecutor = stepExecutor;
	}

	async execute(systemPrompt: string, prompt: string): Promise<Response> {
		this.conversationOrchestrator.initialize();
		this.conversationOrchestrator.addUserMessage(prompt);

		let finalResponse: string | null = null;

		while (!this.conversationOrchestrator.hasReachedMaxSteps()) {
			const stepOutput = await this.stepExecutor.executeStep(
				systemPrompt,
				prompt,
			);
			this.conversationOrchestrator.addStep(stepOutput);

			if (stepOutput.action === "finalize") {
				this.conversationOrchestrator.logFinalization(
					stepOutput.result as string,
				);
				finalResponse = stepOutput.result as string;
				break;
			}

			if (this.conversationOrchestrator.isEroded(stepOutput)) {
				this.conversationOrchestrator.incrementContextSwitches();
			}
		}

		if (!finalResponse) {
			this.conversationOrchestrator.logTimeout();
			finalResponse = `Agent timed out (max ${this.conversationOrchestrator.getMaxSteps()} steps).`;
		}

		this.conversationOrchestrator.addAssistantMessage(finalResponse);

		const steps = this.conversationOrchestrator.getAllSteps();
		const usage = MetadataAggregator.aggregate(steps);

		const agentRuntime: AgentRuntime = {
			response: finalResponse,
			steps,
			usage,
		};

		return new Response(agentRuntime);
	}

	async *executeStreaming(
		systemPrompt: string,
		prompt: string,
	): AsyncGenerator<StepOutput, Response, unknown> {
		this.conversationOrchestrator.initialize();
		this.conversationOrchestrator.addUserMessage(prompt);

		let finalResponse: string | null = null;

		while (!this.conversationOrchestrator.hasReachedMaxSteps()) {
			const stepOutput = await this.stepExecutor.executeStep(
				systemPrompt,
				prompt,
			);
			this.conversationOrchestrator.addStep(stepOutput);

			const steps = this.conversationOrchestrator.getAllSteps();
			const lastStep = steps[steps.length - 1];

			if (lastStep) {
				const output: StepOutput = {
					type: lastStep.type,
					content: lastStep.content,
					result: lastStep.result,
				};

				if (lastStep.action) {
					output.action = lastStep.action;
				}

				if (lastStep.parameter !== undefined) {
					output.parameter = lastStep.parameter;
				}

				yield output;
			}

			if (stepOutput.action === "finalize") {
				this.conversationOrchestrator.logFinalization(
					stepOutput.result as string,
				);
				finalResponse = stepOutput.result as string;
				break;
			}

			if (this.conversationOrchestrator.isEroded(stepOutput)) {
				this.conversationOrchestrator.incrementContextSwitches();
			}
		}

		if (!finalResponse) {
			this.conversationOrchestrator.logTimeout();
			finalResponse = `Agent timed out (max ${this.conversationOrchestrator.getMaxSteps()} steps).`;
		}

		this.conversationOrchestrator.addAssistantMessage(finalResponse);

		const steps = this.conversationOrchestrator.getAllSteps();
		const usage = MetadataAggregator.aggregate(steps);

		const agentRuntime: AgentRuntime = {
			response: finalResponse,
			steps,
			usage,
		};

		return new Response(agentRuntime);
	}
}
