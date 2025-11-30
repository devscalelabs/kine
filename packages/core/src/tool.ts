import { z } from "zod";

export interface Tool<Input = any, Output = any> {
	name: string;
	description: string;
	inputSchema: z.ZodSchema<Input>;
	outputSchema: z.ZodSchema<Output>;
	execute(input: Input): Promise<Output>;
}

export interface ToolDefinition<Input, Output> {
	id: string;
	description: string;
	input: z.ZodSchema<Input>;
	output: z.ZodSchema<Output>;
	execute: (input: Input) => Promise<Output>;
}

export function defineTool<Input, Output>(
	definition: ToolDefinition<Input, Output>,
): Tool<Input, Output> {
	return {
		name: definition.id,
		description: definition.description,
		inputSchema: definition.input,
		outputSchema: definition.output,
		execute: async (input: unknown) => {
			// Validate input against schema
			const validatedInput = definition.input.parse(input);

			// Execute the tool function
			const result = await definition.execute(validatedInput);

			// Validate output against schema (for development/debugging)
			const validatedOutput = definition.output.parse(result);

			return validatedOutput;
		},
	};
}

// Helper function to create simple tools with less boilerplate
export function createTool<Input, Output>(
	id: string,
	description: string,
	inputSchema: z.ZodSchema<Input>,
	outputSchema: z.ZodSchema<Output>,
	execute: (input: Input) => Promise<Output>,
): Tool<Input, Output> {
	return defineTool({
		id,
		description,
		input: inputSchema,
		output: outputSchema,
		execute,
	});
}

// Type inference helpers
export type ToolInput<T extends Tool> =
	T extends Tool<infer Input, any> ? Input : never;
export type ToolOutput<T extends Tool> =
	T extends Tool<any, infer Output> ? Output : never;

// Utility to get tool metadata for system prompts
export function getToolMetadata(tool: Tool): {
	name: string;
	description: string;
	inputExample: string;
	outputExample: string;
} {
	try {
		const inputExample = generateExample(tool.inputSchema);
		const outputExample = generateExample(tool.outputSchema);

		return {
			name: tool.name,
			description: tool.description,
			inputExample: JSON.stringify(inputExample, null, 2),
			outputExample: JSON.stringify(outputExample, null, 2),
		};
	} catch {
		return {
			name: tool.name,
			description: tool.description,
			inputExample: "Unable to generate example",
			outputExample: "Unable to generate example",
		};
	}
}

// Helper function to generate example from Zod schema
function generateExample(schema: z.ZodSchema): any {
	try {
		if (schema instanceof z.ZodObject) {
			const example: Record<string, any> = {};
			const shape = schema.shape;

			for (const [key, fieldSchema] of Object.entries(shape)) {
				example[key] = generateExample(fieldSchema as any);
			}

			return example;
		}

		if (schema instanceof z.ZodArray) {
			return [generateExample(schema.element as any)];
		}

		if (schema instanceof z.ZodString) return "string";
		if (schema instanceof z.ZodNumber) return 0;
		if (schema instanceof z.ZodBoolean) return true;

		if (schema instanceof z.ZodEnum) {
			return schema.options[0];
		}

		if (schema instanceof z.ZodOptional) {
			return generateExample(schema.unwrap() as any);
		}

		if (schema instanceof z.ZodDefault) {
			// Type assertion to handle defaultValue
			const defaultValue = (schema._def as any).defaultValue();
			return typeof defaultValue === "function" ? defaultValue() : defaultValue;
		}

		return null;
	} catch {
		return null;
	}
}
