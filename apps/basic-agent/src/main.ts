import "dotenv/config";
import { defineTool } from "@devscalelabs/kine";
import { Agent } from "@devscalelabs/kine/agent";
import { SimpleMemory } from "@devscalelabs/kine/memory";
import { z } from "zod";

const getWeather = defineTool({
	id: "get_weather",
	description: "Get current weather information for a location",
	input: z.object({
		location: z.string().describe("City name or coordinates"),
		units: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
	}),
	output: z.object({
		temperature: z.number(),
		condition: z.string(),
		humidity: z.number().optional(),
	}),
	execute: async ({ location, units }) => {
		return {
			location: location,
			temperature: units === "celsius" ? 22 : 72,
			condition: "sunny",
			humidity: 65,
		};
	},
});

async function main() {
	// Create a memory instance to store conversation history and steps
	const memory = new SimpleMemory({
		maxMessages: 100,
		maxSteps: 50,
	});

	const agent = new Agent({
		id: "AI Agent",
		model: "openai/gpt-oss-120b:exacto",
		tools: [getWeather],
		memory: memory, // Inject memory into the agent
	});

	const response = await agent.run(
		"What's the weather like in New York in Celcius and Tokyo in Fahrenheit?",
	);
	console.log(response.response);

	console.log("\n=== MEMORY CONVERSATION HISTORY ===");
	console.log(JSON.stringify(memory.toConversationHistory(), null, 2));
}

main().catch(console.error);
