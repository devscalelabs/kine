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
}

export interface Tool<Input = any, Output = any> {
	name: string;
	description: string;
	inputSchema: z.ZodSchema<Input>;
	outputSchema: z.ZodSchema<Output>;
	execute(parameter: any): Promise<any>;
}
