import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";
import { userMessage } from "@devscalelabs/kine/messages";
import { defineTool } from "@devscalelabs/kine/tools";
import { z } from "zod";

const textTools = [
	defineTool({
		name: "count_words",
		description: "Counts the number of words in a text",
		inputSchema: z.object({
			text: z.string().describe("Text to count words in"),
		}),
		outputSchema: z.object({
			count: z.number().describe("Number of words"),
		}),
		execute: async ({ input }) => {
			const count = input.text.trim().split(/\s+/).filter(Boolean).length;
			return { count };
		},
	}),
	defineTool({
		name: "reverse_text",
		description: "Reverses the order of characters in a text",
		inputSchema: z.object({
			text: z.string().describe("Text to reverse"),
		}),
		outputSchema: z.object({
			reversed: z.string().describe("Reversed text"),
		}),
		execute: async ({ input }) => {
			return { reversed: input.text.split("").reverse().join("") };
		},
	}),
];

async function main() {
	const agent = new Agent({
		instruction:
			"You are a helpful text processing assistant. Use the appropriate tool based on user requests.",
		tools: textTools,
	});

	const response = await agent.run({
		messages: [userMessage("Count the words in: 'Hello world this is a test'")],
	});

	console.log(response);
}

main().catch(console.error);
