import type { AgentRuntime } from "./types";

export class Response {
	private rawResponse: AgentRuntime;

	constructor(agentRuntime: AgentRuntime) {
		this.rawResponse = agentRuntime;
	}

	getRawResponse(): AgentRuntime {
		return this.rawResponse;
	}

	beautify(): string {
		const { response, steps } = this.rawResponse;

		let output = "";

		output += "=".repeat(80) + "\n";
		output += "KINE AGENT RESPONSE\n";
		output += "=".repeat(80) + "\n\n";

		output += "Final Answer:\n";
		output += `${response}\n\n`;

		if (steps && steps.length > 0) {
			output += "Execution Steps:\n";
			output += "-".repeat(60) + "\n";

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

				if (index < steps.length - 1) {
					output += "-".repeat(40) + "\n";
				}
			});

			output += "-".repeat(60) + "\n";

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

		output += "\n" + "=".repeat(80) + "\n";

		return output;
	}

	getSummary(): string {
		const { response, steps } = this.rawResponse;
		const totalSteps = steps?.length || 0;
		const toolSteps = steps?.filter((s) => s.type === "tool").length || 0;
		const errorSteps = steps?.filter((s) => s.type === "error").length || 0;

		return `Response: ${response.substring(0, 100)}${response.length > 100 ? "..." : ""} | Steps: ${totalSteps} (Tools: ${toolSteps}, Errors: ${errorSteps})`;
	}

	getFinalAnswer(): string {
		return this.rawResponse.response;
	}

	getFormattedSteps(): string {
		const { steps } = this.rawResponse;
		if (!steps || steps.length === 0) return "No steps recorded.";

		return steps
			.map((step, index) => {
				let stepStr = `Step ${index + 1} (${step.type}): ${step.action || "N/A"}`;
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
				return stepStr;
			})
			.join("\n\n");
	}
}
