import type { ParsedResponse } from "./parser";
import type { ResponseFormatter, StepOutput } from "./response-formatter";

export class XMLResponseFormatter implements ResponseFormatter {
	parseResponse(rawResponse: string): ParsedResponse {
		const { parseXMLResponse } = require("./parser");
		return parseXMLResponse(rawResponse);
	}

	validateResponse(parsed: ParsedResponse): {
		isValid: boolean;
		error?: string;
	} {
		if (!parsed.action) {
			return {
				isValid: false,
				error: "LLM response missing 'action' tag",
			};
		}

		if (parsed.action === "finalize") {
			const finalAnswer = parsed.finalAnswer || "";
			if (!finalAnswer.trim()) {
				return {
					isValid: false,
					error:
						"final_answer cannot be empty. Provide a substantive response with <final_answer> tag.",
				};
			}
		}

		return { isValid: true };
	}

	formatError(error: Error | string, context?: string): StepOutput {
		const errorMessage = error instanceof Error ? error.message : String(error);

		return {
			type: "error",
			content: context || "Error occurred",
			result: `${context ? `${context}: ` : ""}${errorMessage}`,
		};
	}

	formatValidationError(error: string, parsed: ParsedResponse): StepOutput {
		const output: StepOutput = {
			type: "error",
			content: parsed.thought || "Validation error",
			result: error,
		};

		if (parsed.action) {
			output.action = parsed.action;
		}

		if (parsed.parameter !== undefined) {
			output.parameter = parsed.parameter;
		}

		return output;
	}

	formatFinalizeResponse(
		parsed: ParsedResponse,
		llmMetadata?: any,
	): StepOutput {
		return {
			type: "agent",
			content: parsed.thought || "",
			action: "finalize",
			parameter: parsed.parameter,
			result: parsed.finalAnswer,
			llmMetadata,
		};
	}

	formatToolResponse(parsed: ParsedResponse, llmMetadata?: any): StepOutput {
		const output: StepOutput = {
			type: "tool",
			content: parsed.thought || "",
			result: "pending",
		};

		if (parsed.action) {
			output.action = parsed.action;
		}

		if (parsed.parameter !== undefined) {
			output.parameter = parsed.parameter;
		}

		if (llmMetadata) {
			output.llmMetadata = llmMetadata;
		}

		return output;
	}

	formatImageAnalysisResponse(
		parsed: ParsedResponse,
		llmMetadata?: any,
	): StepOutput {
		const output: StepOutput = {
			type: "tool",
			content: parsed.thought || "",
			action: "analyze_image",
			parameter: parsed.parameter,
			result: parsed.imageAnalysis,
			llmMetadata,
		};

		return output;
	}

	formatImageGenerationResponse(
		parsed: ParsedResponse,
		llmMetadata?: any,
	): StepOutput {
		const output: StepOutput = {
			type: "tool",
			content: parsed.thought || "",
			action: "generate_image",
			parameter: parsed.parameter,
			result: parsed.imageGeneration,
			llmMetadata,
		};

		return output;
	}
}
