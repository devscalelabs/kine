import type { AggregateUsage, StepMeta } from "../memory/metadata";
import type { AgentRuntime } from "../types";
import { TerminalUI } from "../ui/terminal-ui";
import type { DebugLogger } from "../utils/debug-logger";

export class Response {
	private rawResponse: AgentRuntime;
	private debugUI?: TerminalUI;

	constructor(agentRuntime: AgentRuntime) {
		this.rawResponse = agentRuntime;
	}

	getRawResponse(): AgentRuntime {
		return this.rawResponse;
	}

	getTokenUsage(): AggregateUsage | undefined {
		return this.rawResponse.usage;
	}

	getStepMetadata(index: number): StepMeta | undefined {
		const step = this.rawResponse.steps?.[index];
		return step?.meta;
	}

	beautify(): string {
		const { response, steps, usage } = this.rawResponse;

		let output = "";

		output += `${"=".repeat(80)}\n`;
		output += "KINE AGENT RESPONSE\n";
		output += `${"=".repeat(80)}\n\n`;

		output += "Final Answer:\n";
		output += `${response}\n\n`;

		if (steps && steps.length > 0) {
			output += "Execution Steps:\n";
			output += `${"-".repeat(60)}\n`;

			steps.forEach((step, index) => {
				const stepNumber = index + 1;
				const stepType = step.type.toUpperCase();

				output += `Step ${stepNumber} (${stepType})\n`;

				if (step.content) {
					output += `Thought: ${step.content}\n`;
				}

				if (step.action) {
					output += `Action: ${step.action}\n`;
				}

				if (step.parameter) {
					output += `Parameters: ${JSON.stringify(step.parameter, null, 2)}\n`;
				}

				if (step.result) {
					const resultStr =
						typeof step.result === "string"
							? step.result
							: JSON.stringify(step.result, null, 2);
					output += `Result: ${resultStr}\n`;
				}

				if (step.meta?.tokens) {
					output += `Tokens: ${step.meta.tokens.prompt_tokens} in / ${step.meta.tokens.completion_tokens} out\n`;
				}

				if (step.meta?.latency) {
					output += `Latency: ${step.meta.latency}ms\n`;
				}

				if (index < steps.length - 1) {
					output += `${"-".repeat(40)}\n`;
				}
			});

			output += `${"-".repeat(60)}\n`;

			const totalSteps = steps.length;
			const toolSteps = steps.filter((s) => s.type === "tool").length;
			const errorSteps = steps.filter((s) => s.type === "error").length;

			output += "\nExecution Summary:\n";
			output += `Total Steps: ${totalSteps}\n`;
			output += `Successful Tool Calls: ${toolSteps}\n`;
			if (errorSteps > 0) {
				output += `Errors: ${errorSteps}\n`;
			}
		}

		if (usage) {
			output += "\nToken Usage:\n";
			output += `Prompt Tokens: ${usage.total_prompt_tokens}\n`;
			output += `Completion Tokens: ${usage.total_completion_tokens}\n`;
			output += `Total Tokens: ${usage.total_tokens}\n`;
			output += `Total Latency: ${usage.total_latency}ms\n`;
			output += `LLM Calls: ${usage.llm_calls}\n`;
		}

		output += `\n${"=".repeat(80)}\n`;

		return output;
	}

	getSummary(): string {
		const { response, steps, usage } = this.rawResponse;
		const totalSteps = steps?.length || 0;
		const toolSteps = steps?.filter((s) => s.type === "tool").length || 0;
		const errorSteps = steps?.filter((s) => s.type === "error").length || 0;

		let summary = `Response: ${response.substring(0, 100)}${
			response.length > 100 ? "..." : ""
		} | Steps: ${totalSteps} (Tools: ${toolSteps}, Errors: ${errorSteps})`;

		if (usage) {
			summary += ` | Tokens: ${usage.total_tokens}`;
		}

		return summary;
	}

	getFinalAnswer(): string {
		return this.rawResponse.response;
	}

	getFormattedSteps(): string {
		const { steps } = this.rawResponse;
		if (!steps || steps.length === 0) return "No steps recorded.";

		return steps
			.map((step, index) => {
				let stepStr = `Step ${index + 1} (${step.type}): ${
					step.action || "N/A"
				}`;
				if (step.content) {
					stepStr += `\n  Thought: ${step.content}`;
				}
				if (step.result) {
					const resultStr =
						typeof step.result === "string"
							? step.result
							: JSON.stringify(step.result);
					stepStr += `\n  Result: ${resultStr}`;
				}
				if (step.meta?.tokens) {
					stepStr += `\n  Tokens: ${step.meta.tokens.total_tokens}`;
				}
				if (step.meta?.latency) {
					stepStr += `\n  Latency: ${step.meta.latency}ms`;
				}
				return stepStr;
			})
			.join("\n\n");
	}

	debug(debugLogger?: DebugLogger): void {
		if (!this.debugUI) {
			this.debugUI = new TerminalUI(this.rawResponse, debugLogger);
		}
		this.debugUI.render();
	}
}
