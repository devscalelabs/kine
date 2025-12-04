import { DEFAULT_ACTION } from "../response/config";
import type { ParsedResponse } from "../types";

export function parsePlainTextResponse(
	rawMsg: string,
	availableToolNames: string[] = [],
): ParsedResponse {
	let detectedAction: string | undefined;

	// Always include "finalize" as a valid action
	const allActionKeywords = [DEFAULT_ACTION, ...availableToolNames];

	for (const keyword of allActionKeywords) {
		if (rawMsg.toLowerCase().includes(keyword)) {
			detectedAction = keyword;
			break;
		}
	}

	if (!detectedAction && rawMsg.length > 10) {
		detectedAction = DEFAULT_ACTION;
	}

	return {
		thought: `${rawMsg.substring(0, 100)}...`,
		action: detectedAction,
		finalAnswer: detectedAction === DEFAULT_ACTION ? rawMsg.trim() : undefined,
	};
}
