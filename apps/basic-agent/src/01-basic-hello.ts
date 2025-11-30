import "dotenv/config";
import { Agent } from "@devscalelabs/kine";
import { userMessage } from "@devscalelabs/kine/messages";
import { defineTool } from "@devscalelabs/kine/tools";
import { z } from "zod";

const helloTool = defineTool({
	name: "hello",
	description: "Returns a greeting message",
	inputSchema: z.object({
		name: z.string().describe("Name to greet"),
	}),
	outputSchema: z.object({
		greeting: z.string().describe("Greeting message"),
	}),
	execute: async ({ input }) => {
		return {
			greeting: `Hello, ${input.name}!`,
		};
	},
});

async function main() {
	const agent = new Agent({
		instruction:
			"You are a friendly greeting bot. Always use the hello tool when someone says hello.",
		tools: [helloTool],
	});

	const response = await agent.run({
		messages: [userMessage("Hi there!")],
	});

	console.log(response);
}

main().catch(console.error);
