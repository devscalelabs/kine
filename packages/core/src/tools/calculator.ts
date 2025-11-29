import { z } from "zod";
import { defineTool } from "./index";

export const calculatorTool = defineTool({
	name: "calculator",
	description:
		"Perform basic arithmetic operations (add, subtract, multiply, divide)",
	inputSchema: z.object({
		operation: z.enum(["add", "subtract", "multiply", "divide"]),
		a: z.number(),
		b: z.number(),
	}),
	outputSchema: z.object({
		result: z.number(),
		operation: z.string(),
	}),
	execute: async ({ input }) => {
		const { operation, a, b } = input;
		let result: number;

		switch (operation) {
			case "add":
				result = a + b;
				break;
			case "subtract":
				result = a - b;
				break;
			case "multiply":
				result = a * b;
				break;
			case "divide":
				if (b === 0) {
					throw new Error("Division by zero is not allowed");
				}
				result = a / b;
				break;
			default:
				throw new Error(`Unknown operation: ${operation}`);
		}

		return {
			result,
			operation: `${a} ${operation} ${b} = ${result}`,
		};
	},
});
