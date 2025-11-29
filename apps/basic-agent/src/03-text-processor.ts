import "dotenv/config";
import { Agent } from "@kine/core/agent";
import { userMessage } from "@kine/core/messages";
import { defineTool } from "@kine/core/tools";
import { z } from "zod";

const textTools = [
	defineTool({
		name: "count_words",
		description: "Counts the number of words in a text",
		inputSchema: z.object({
			text: z.string().describe("Text to count words in"),
		}),
		outputSchema: z.object({
			wordCount: z.number(),
			characterCount: z.number(),
		}),
		execute: async ({ input }) => {
			const words = input.text
				.trim()
				.split(/\s+/)
				.filter((word: string) => word.length > 0);
			return {
				wordCount: words.length,
				characterCount: input.text.length,
			};
		},
	}),

	defineTool({
		name: "reverse_text",
		description: "Reverses the given text",
		inputSchema: z.object({
			text: z.string().describe("Text to reverse"),
		}),
		outputSchema: z.object({
			reversed: z.string(),
		}),
		execute: async ({ input }) => {
			return {
				reversed: input.text.split("").reverse().join(""),
			};
		},
	}),
];

async function main() {
	const agent = new Agent({
		instruction:
			"You are a text analysis expert. Always provide detailed insights about the text structure and characteristics when processing text.",
		tools: textTools,
	});

	console.log("Running text processing example...");
	try {
		const result = await agent.run({
			messages: [
				userMessage(
					"Count the words in 'Hello world, how are you today?' and then reverse that text",
				),
			],
		});
		console.log("Agent response:", result);
	} catch (error) {
		console.error("Error:", error);
	}
}

main().catch(console.error);
