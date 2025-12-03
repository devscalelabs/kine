export interface ParsedResponse {
	thought?: string | undefined;
	action?: string | undefined;
	parameter?: any;
	finalAnswer?: string | undefined;
}

export function extractXMLTag(content: string, tag: string): string | null {
	const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
	const match = content.match(regex);
	return match && match[1] ? match[1].trim() : null;
}

export function parseXMLParameter(parameterStr: string | null): any {
	if (!parameterStr) return null;

	try {
		return JSON.parse(parameterStr);
	} catch {
		const param: any = {};
		const tagMatches = parameterStr.matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g);

		for (const match of tagMatches) {
			const tagName = match[1];
			const tagContent = match[2];
			if (tagName && tagContent) {
				try {
					param[tagName] = JSON.parse(tagContent);
				} catch {
					param[tagName] = tagContent.trim();
				}
			}
		}

		return Object.keys(param).length > 0 ? param : parameterStr.trim();
	}
}

export function parseXMLResponse(rawMsg: string): ParsedResponse {
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

	return parsePlainTextResponse(rawMsg);
}

function parsePlainTextResponse(rawMsg: string): ParsedResponse {
	const actionKeywords = ["finalize", "get_weather", "calculate_tip"];
	let detectedAction: string | undefined;

	for (const keyword of actionKeywords) {
		if (rawMsg.toLowerCase().includes(keyword)) {
			detectedAction = keyword;
			break;
		}
	}

	if (!detectedAction && rawMsg.length > 10) {
		detectedAction = "finalize";
	}

	return {
		thought: rawMsg.substring(0, 100) + "...",
		action: detectedAction,
		finalAnswer: detectedAction === "finalize" ? rawMsg.trim() : undefined,
	};
}
