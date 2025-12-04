// Re-export types and main parsing function from modular structure

export type {
	ImageAnalysisResult,
	ImageGenerationRequest,
	ParsedResponse,
} from "./types";
export { parseXMLResponse } from "../parsers";
