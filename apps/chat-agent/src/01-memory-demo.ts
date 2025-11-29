import "dotenv/config";
import { Agent, simpleMemory, userMessage } from "@kine/core";
import { defineTool } from "@kine/core/tools";
import { z } from "zod";

const TimeInputSchema = z.object({
	timezone: z
		.string()
		.optional()
		.describe("The timezone, e.g. UTC, America/New_York"),
});

const TimeOutputSchema = z.object({
	time: z.string(),
	timezone: z.string(),
});

const timeTool = defineTool({
	name: "get_current_time",
	description: "Get the current time",
	inputSchema: TimeInputSchema,
	outputSchema: TimeOutputSchema,
	execute: async ({ input }) => {
		const { timezone = "UTC" } = input;
		console.log(`[TimeTool] Getting current time for ${timezone}`);

		const now = new Date();
		return {
			time: now.toLocaleTimeString("en-US", { timeZone: timezone }),
			timezone: timezone,
		};
	},
});

async function main() {
	const memory = simpleMemory();
	const agent = new Agent({
		memory: memory,
		tools: [timeTool],
	});

	console.log("Running memory demo...");

	try {
		// First conversation
		console.log("\n=== First Conversation ===");
		const result1 = await agent.run({
			messages: [userMessage("Hi! What's your name?")],
		});
		console.log("Agent response:", result1);

		// Second conversation - agent should remember previous interaction
		console.log("\n=== Second Conversation ===");
		const result2 = await agent.run({
			messages: [userMessage("What time is it now?")],
		});
		console.log("Agent response:", result2);

		// Third conversation - testing memory persistence
		console.log("\n=== Third Conversation ===");
		const result3 = await agent.run({
			messages: [userMessage("Do you remember what we talked about earlier?")],
		});
		console.log("Agent response:", result3);

		// Show memory contents
		console.log("\n=== Memory Contents ===");
		const messages = memory.getMessages();
		messages.forEach((msg, index) => {
			console.log(`${index + 1}. [${msg.role}]: ${msg.content}`);
		});
	} catch (error) {
		console.error("Error running agent:", error);
	}
}

main().catch(console.error);
