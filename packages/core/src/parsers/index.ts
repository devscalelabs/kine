import { parsePlainTextResponse } from "./plain-text-parser";
import {
	extractXMLTag,
	parseImageAnalysis,
	parseImageGeneration,
	parseXMLParameter,
} from "./xml-parser";
import type { ParsedResponse } from "../types";

export function parseXMLResponse(rawMsg: string): ParsedResponse {
	const thought = extractXMLTag(rawMsg, "thought");
	const action = extractXMLTag(rawMsg, "action");
	const parameterStr = extractXMLTag(rawMsg, "parameter");
	const finalAnswer = extractXMLTag(rawMsg, "final_answer");
	const imageAnalysisStr = extractXMLTag(rawMsg, "image_analysis");
	const imageGenerationStr = extractXMLTag(rawMsg, "image_generation");

	const parameter = parseXMLParameter(parameterStr);
	const imageAnalysis = imageAnalysisStr
		? parseImageAnalysis(imageAnalysisStr)
		: undefined;
	const imageGeneration = imageGenerationStr
		? parseImageGeneration(imageGenerationStr)
		: undefined;

	if (thought || action || finalAnswer || imageAnalysis || imageGeneration) {
		return {
			thought: thought || undefined,
			action: action || undefined,
			parameter,
			finalAnswer: finalAnswer || undefined,
			imageAnalysis,
			imageGeneration,
		};
	}

	return parsePlainTextResponse(rawMsg);
}
