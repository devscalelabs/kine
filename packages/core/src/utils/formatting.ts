import type { ImageAnalysisResult, ImageGenerationResult } from "../types";

export function formatStepResult(result: any): string {
	if (typeof result === "string") {
		return result;
	}

	// Handle image results specially
	if (result && typeof result === "object") {
		if (result.url) {
			return `Generated Image: ${result.url}`;
		}
		if (result.b64_json) {
			return `Generated Image (base64): [${result.b64_json.length} characters]`;
		}
		if (result.description) {
			// Image analysis result
			let analysis = `Image Analysis: ${result.description}`;
			if (result.objects && result.objects.length > 0) {
				analysis += `\nObjects: ${result.objects.join(", ")}`;
			}
			if (result.text && result.text.length > 0) {
				analysis += `\nText: ${result.text.join(", ")}`;
			}
			return analysis;
		}
	}

	return JSON.stringify(result, null, 2);
}

export function extractImageAnalysisResults(
	steps: any[],
): ImageAnalysisResult[] {
	const results: ImageAnalysisResult[] = [];
	for (const step of steps) {
		if (step.action === "analyze_image" && step.result) {
			results.push(step.result as ImageAnalysisResult);
		}
	}
	return results;
}

export function extractImageGenerationResults(
	steps: any[],
): ImageGenerationResult[] {
	const results: ImageGenerationResult[] = [];
	for (const step of steps) {
		if (step.action === "generate_image" && step.result) {
			results.push(step.result as ImageGenerationResult);
		}
	}
	return results;
}

export function extractImageUrls(
	imageResults: ImageGenerationResult[],
): string[] {
	const urls: string[] = [];
	for (const result of imageResults) {
		if (result.url) {
			urls.push(result.url);
		}
	}
	return urls;
}

export function extractImageBase64Data(
	imageResults: ImageGenerationResult[],
): string[] {
	const base64Data: string[] = [];
	for (const result of imageResults) {
		if (result.b64_json) {
			base64Data.push(result.b64_json);
		}
	}
	return base64Data;
}
