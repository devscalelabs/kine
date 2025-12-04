import type { ImageAnalysisResult, ImageGenerationRequest } from "../types";

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

export function parseImageAnalysis(
	imageAnalysisStr: string,
): ImageAnalysisResult {
	try {
		return JSON.parse(imageAnalysisStr);
	} catch {
		// Fallback to simple text parsing
		return {
			description: imageAnalysisStr.trim(),
		};
	}
}

export function parseImageGeneration(
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
