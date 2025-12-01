import type { z } from "zod";

export type Step = {
	type: "agent" | "error" | "tool";
	content: string;
	action?: string;
	parameter?: any;
	result?: any;
	meta?: { ctxSwitches: number } | undefined;
};

export type AgentRuntime = { response: string; steps: Step[] };

export interface AgentConfig {
	id: string;
	description?: string;
	model: string;
	apiKey?: string;
	baseURL?: string;
	tools?: Tool[];
	memory?: BaseMemory;
}

export interface BaseMemory {
	// Message management
	addMessage(
		role: "user" | "assistant" | "system",
		content: string,
		metadata?: Record<string, any>,
	): void;
	getMessages(): MemoryMessage[];
	getRecentMessages(count: number): MemoryMessage[];
	clearMessages(): void;

	// Step management
	addStep(step: Omit<Step, "meta">, stepNumber: number): void;
	getSteps(): MemoryStep[];
	getRecentSteps(count: number): MemoryStep[];
	clearSteps(): void;

	// Utility
	clearAll(): void;
	getStats(): Record<string, number>;
}

export interface MemoryMessage {
	role: "user" | "assistant" | "system";
	content: string;
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
