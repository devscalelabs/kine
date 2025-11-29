import "dotenv/config";
import { Agent } from "@kine/core/agent";
import { userMessage } from "@kine/core/messages";
import { defineTool } from "@kine/core/tools";
import { z } from "zod";

const helloTool = defineTool({
	name: "hello",
	description: "Returns a greeting message",
	inputSchema: z.object({
		name: z.string().describe("Name to greet"),
	}),
	outputSchema: z.object({
		message: z.string(),
	}),
	execute: async ({ input }) => {
		return {
			message: `Hello, ${input.name}!`,
		};
	},
});

async function main() {
	const agent = new Agent({
		model: "meituan/longcat-flash-chat",
		instruction:
			"You are a friendly assistant that always greets people warmly and enthusiastically.",
		tools: [helloTool],
	});

	console.log("Running basic example...");
	try {
		const result = await agent.run({
			messages: [userMessage("Say hello to Alice using helloTool!")],
		});
		console.log("Agent response:", result);
	} catch (error) {
		console.error("Error:", error);
	}
}

main().catch(console.error);
