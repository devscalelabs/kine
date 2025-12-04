import { parsePlainTextResponse } from "./plain-text-parser";
import { extractXMLTag, parseXMLParameter } from "./xml-parser";
import type { ParsedResponse } from "../types";

export function parseXMLResponse(
	rawMsg: string,
	availableToolNames: string[] = [],
): ParsedResponse {
	const thought = extractXMLTag(rawMsg, "thought");
	const action = extractXMLTag(rawMsg, "action");
	const parameterStr = extractXMLTag(rawMsg, "parameter");
	const finalAnswer = extractXMLTag(rawMsg, "final_answer");

	const parameter = parseXMLParameter(parameterStr);

	if (thought || action || finalAnswer) {
		return {
			thought: thought || undefined,
			action: action || undefined,
			parameter,
			finalAnswer: finalAnswer || undefined,
		};
	}

	return parsePlainTextResponse(rawMsg, availableToolNames);
}
