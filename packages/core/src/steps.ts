import type { StepMeta, TokenUsage } from "./metadata";
import type { Step } from "./types";

type LLMMetadata = {
	tokens?: TokenUsage;
	latency?: number;
	model?: string;
	finish_reason?: string;
};

export class StepsManager {
	private steps: Step[] = [];
	private maxSteps: number;

	constructor(maxSteps: number = 3) {
		this.maxSteps = maxSteps;
	}

	initialize(): void {
		this.steps = [
			{
				type: "agent",
				content: "Agent task started by user",
				action: "pending",
				parameter: null,
				meta: { ctxSwitches: 0 },
			},
		];
	}

	addStep(step: Omit<Step, "meta">, llmMetadata?: LLMMetadata): void {
		const meta: StepMeta = {
			ctxSwitches: this.steps[0]?.meta?.ctxSwitches ?? 0,
		};

		if (llmMetadata) {
			if (llmMetadata.tokens) meta.tokens = llmMetadata.tokens;
			if (llmMetadata.latency) meta.latency = llmMetadata.latency;
			if (llmMetadata.model) meta.model = llmMetadata.model;
			if (llmMetadata.finish_reason)
				meta.finish_reason = llmMetadata.finish_reason;
		}

		this.steps.push({
			...step,
			meta,
		});
	}

	getAllSteps(): Step[] {
		return this.steps;
	}

	getPastSteps(): Step[] {
		return this.steps.slice(1);
	}

	getStepCount(): number {
		return this.steps.length - 1;
	}

	hasReachedMaxSteps(): boolean {
		return this.getStepCount() >= this.maxSteps;
	}

	getMaxSteps(): number {
		return this.maxSteps;
	}

	incrementContextSwitches(): void {
		if (this.steps[0]?.meta) {
			this.steps[0].meta.ctxSwitches++;
		}
	}

	getContextSwitches(): number {
		return this.steps[0]?.meta?.ctxSwitches ?? 0;
	}

	isEroded(step: { result?: any }): boolean {
		return (
			step.result === "pending" ||
			step.result === "Tool not found" ||
			step.result === "Tool execution failed" ||
			step.result === "No action provided" ||
			step.result === "GPT skipped 'action'"
		);
	}

	/**
	 * Builds a conversation history from past steps for AI model context.
	 * Converts step history into a format suitable for AI conversation, where:
	 * - Assistant messages contain thoughts, actions, and parameters
	 * - User messages contain observations/results from executed actions
	 * This formatted history helps the AI understand the sequence of previous
	 * actions and their outcomes to make informed decisions about next steps.
	 */
	buildConversationHistory(): Array<{
		role: "assistant" | "user";
		content: string;
	}> {
		const history: Array<{ role: "assistant" | "user"; content: string }> = [];
		const pastSteps = this.getPastSteps();

		for (const s of pastSteps) {
			if (
				(s.type === "agent" || s.type === "tool" || s.type === "error") &&
				s.action
			) {
				let msg = `thought: ${s.content || ""}\naction: ${s.action}\n`;
				if (s.parameter) {
					msg += `parameter:\n${this.parameterToYAML(s.parameter)}\n`;
				}
				history.push({ role: "assistant", content: msg });
			}
			if (
				(s.type === "tool" || s.type === "agent" || s.type === "error") &&
				s.result !== undefined &&
				s.result !== "pending"
			) {
				history.push({
					role: "user",
					content: `observation:\n${JSON.stringify(s.result, null, 1)}`,
				});
			}
		}

		return history;
	}

	/**
	 * Converts a parameter value to YAML format for display in step history.
	 * Handles objects by converting each key-value pair to YAML-style indentation,
	 * and converts primitive values to strings. Used to format parameters when
	 * storing step execution history for debugging and auditing purposes.
	 */
	private parameterToYAML(p: any): string {
		if (typeof p === "object" && p !== null) {
			return Object.entries(p)
				.map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
				.join("\n");
		}
		return String(p);
	}
}
