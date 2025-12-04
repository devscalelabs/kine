import type { AggregateUsage, StepMeta } from "../memory/metadata";
import type {
	AgentRuntime,
	ImageAnalysisResult,
	ImageGenerationResult,
} from "../types";
import {
	extractImageAnalysisResults,
	extractImageBase64Data,
	extractImageGenerationResults,
	extractImageUrls,
} from "../utils/formatting";
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

	getImageAnalysisResults(): ImageAnalysisResult[] {
		if (!this.rawResponse.steps) return [];
		return extractImageAnalysisResults(this.rawResponse.steps);
	}

	getImageGenerationResults(): ImageGenerationResult[] {
		if (!this.rawResponse.steps) return [];
		return extractImageGenerationResults(this.rawResponse.steps);
	}

	getImageUrls(): string[] {
		return extractImageUrls(this.getImageGenerationResults());
	}

	getImageBase64Data(): string[] {
		return extractImageBase64Data(this.getImageGenerationResults());
	}

	hasImageContent(): boolean {
		return (
			this.getImageAnalysisResults().length > 0 ||
			this.getImageGenerationResults().length > 0
		);
	}
}
