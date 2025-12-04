import type { AggregateUsage, StepMeta } from "../memory/metadata";
import type { AgentRuntime } from "../types";
import {
	formatBeautifiedResponse,
	formatSteps,
	formatSummary,
} from "../utils/response-display";

export class Response {
	private rawResponse: AgentRuntime;

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
		return formatBeautifiedResponse(this.rawResponse);
	}

	getSummary(): string {
		return formatSummary(this.rawResponse);
	}

	getFinalAnswer(): string {
		return this.rawResponse.response;
	}

	getFormattedSteps(): string {
		return formatSteps(this.rawResponse);
	}
}
