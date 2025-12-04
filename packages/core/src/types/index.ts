import type { z } from "zod";

import type { AggregateUsage, StepMeta } from "../memory/metadata";

export type Step = {
	type: "agent" | "error" | "tool";
	content: string;
	action?: string;
	parameter?: any;
	result?: any;
	meta?: StepMeta;
};

export type AgentRuntime = {
	response: string;
	steps: Step[];
	usage?: AggregateUsage;
};

export interface AgentConfig {
	id: string;
	description?: string;
	model: string;
	apiKey?: string;
	baseURL?: string;
	tools?: Tool[];
	memory?: BaseMemory;
	maxSteps?: number;
	debug?: boolean;
}

export interface BaseMemory {
	// Message management
	addMessage(
		role: "user" | "assistant" | "system",
		content: string | MultimodalContent,
		metadata?: Record<string, any>,
	): void;
	getMessages(): MemoryMessage[];
	getRecentMessages(count: number): MemoryMessage[];
	clearMessages(): void;

	// Step management
	addStep(step: Step, stepNumber: number): void;
	getSteps(): MemoryStep[];
	getRecentSteps(count: number): MemoryStep[];
	clearSteps(): void;

	// Utility
	clearAll(): void;
	getStats(): Record<string, number>;
	getTokenUsage(): any;
	toConversationHistory(): import("openai/resources").ChatCompletionMessageParam[];
	stepsToConversationHistory(): Array<{
		role: "assistant" | "user";
		content: string;
	}>;
}

export interface MemoryMessage {
	role: "user" | "assistant" | "system";
	content: string | MultimodalContent;
	timestamp: Date;
	metadata?: Record<string, any> | undefined;
}

export interface MemoryStep extends Step {
	timestamp: Date;
	stepNumber: number;
}

export interface MemoryConfig {
	maxMessages?: number;
	maxSteps?: number;
}

export interface Tool<Input = any, Output = any> {
	name: string;
	description: string;
	inputSchema: z.ZodSchema<Input>;
	outputSchema: z.ZodSchema<Output>;
	execute(parameter: any): Promise<any>;
}

export interface MultimodalContent {
	text?: string;
	images?: string[];
	type?: "text" | "image";
	image_url?: {
		url: string;
		detail?: "low" | "high" | "auto";
	};
}

export interface ImageAnalysisResult {
	description: string;
	objects?: string[];
	text?: string[];
	emotions?: string[];
	colors?: string[];
	confidence?: number;
}

export interface ImageGenerationResult {
	url?: string;
	b64_json?: string;
	revised_prompt?: string;
	model: string;
	created: number;
}

export interface ImageGenerationConfig {
	model?: string;
	quality?: string;
	size?: string;
	style?: string;
	n?: number;
	response_format?: string;
}
