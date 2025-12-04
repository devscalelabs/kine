import type { ParsedResponse } from "./parser";

export interface StepOutput {
	type: "agent" | "error" | "tool";
	content: string;
	action?: string;
	parameter?: any;
	result?: any;
	llmMetadata?: {
		tokens?: any;
		latency: number;
		model: string;
		finish_reason?: string;
	};
}

export interface ResponseFormatter {
	parseResponse(rawResponse: string): ParsedResponse;
	validateResponse(parsed: ParsedResponse): {
		isValid: boolean;
		error?: string;
	};
	formatError(error: Error | string, context?: string): StepOutput;

	formatValidationError(error: string, parsed: ParsedResponse): StepOutput;
	formatFinalizeResponse(parsed: ParsedResponse, metadata: any): StepOutput;
	formatToolResponse(parsed: ParsedResponse, metadata: any): StepOutput;
}
