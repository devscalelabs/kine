import { Agent } from "@devscalelabs/kine/agent";
import { SimpleMemory } from "@devscalelabs/kine/memory";
import { defineTool } from "@devscalelabs/kine/tool";
import { z } from "zod";

const calculator = defineTool({
	id: "calculator",
	description: "Perform basic math calculations",
	input: z.object({
		operation: z.enum(["add", "subtract", "multiply", "divide"]),
		a: z.number(),
		b: z.number(),
	}),
	output: z.object({
		result: z.number(),
	}),
	execute: async ({ operation, a, b }) => {
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
				result = b !== 0 ? a / b : 0;
				break;
			default:
				result = 0;
		}

		return { result };
	},
});

export async function example02() {
	const memory = new SimpleMemory({
		maxMessages: 50,
		maxSteps: 20,
	});

	const agent = new Agent({
		id: "Calculator Agent",
		model: "qwen/qwen3-30b-a3b-instruct-2507",
		tools: [calculator],
		memory: memory,
		maxSteps: 50,
		debug: true,
	});

	const response = await agent.run(
		"Please calculate: 15 + 27, 100 - 42, 8 × 6, and 144 ÷ 12",
	);

	console.log(response.getRawResponse().response);
}
