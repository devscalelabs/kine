export interface ParsedResponse {
	thought?: string | undefined;
	action?: string | undefined;
	parameter?: any;
	finalAnswer?: string | undefined;
	imageAnalysis?: ImageAnalysisResult | undefined;
	imageGeneration?: ImageGenerationRequest | undefined;
}

export interface ImageAnalysisResult {
	description: string;
	objects?: string[];
	text?: string[];
	emotions?: string[];
	colors?: string[];
	confidence?: number;
}

export interface ImageGenerationRequest {
	prompt: string;
	config?: {
		model?: string;
		quality?: string;
		size?: string;
		style?: string;
		n?: number;
		response_format?: string;
	};
}

export function extractXMLTag(content: string, tag: string): string | null {
	const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
	const match = content.match(regex);
	return match?.[1] ? match[1].trim() : null;
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

function parsePlainTextResponse(rawMsg: string): ParsedResponse {
	const actionKeywords = [
		"finalize",
		"get_weather",
		"calculate_tip",
		"analyze_image",
		"generate_image",
	];
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
		thought: `${rawMsg.substring(0, 100)}...`,
		action: detectedAction,
		finalAnswer: detectedAction === "finalize" ? rawMsg.trim() : undefined,
	};
}

function parseImageAnalysis(imageAnalysisStr: string): ImageAnalysisResult {
	try {
		return JSON.parse(imageAnalysisStr);
	} catch {
		// Fallback to simple text parsing
		return {
			description: imageAnalysisStr.trim(),
		};
	}
}

function parseImageGeneration(
	imageGenerationStr: string,
): ImageGenerationRequest {
	try {
		return JSON.parse(imageGenerationStr);
	} catch {
		// Fallback to simple prompt
		return {
			prompt: imageGenerationStr.trim(),
		};
	}
}
