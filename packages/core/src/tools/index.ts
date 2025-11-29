import type { z } from "zod";

export interface ToolContext {
	input: any;
	output?: any;
}

export interface ToolInterface {
	name: string;
	description: string;
	inputSchema: z.ZodType<any>;
	outputSchema: z.ZodType<any>;
	execute(context: ToolContext): Promise<any>;
}

export function defineTool<
	TInput extends z.ZodType<any>,
	TOutput extends z.ZodType<any>,
>(config: {
	name: string;
	description: string;
	inputSchema: TInput;
	outputSchema: TOutput;
	execute: (
		context: ToolContext & { input: z.infer<TInput> },
	) => Promise<z.infer<TOutput>>;
}): ToolInterface {
	return {
		name: config.name,
		description: config.description,
		inputSchema: config.inputSchema,
		outputSchema: config.outputSchema,
		execute: config.execute as (context: ToolContext) => Promise<any>,
	};
}
