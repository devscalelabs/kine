import { Agent } from "@devscalelabs/kine/agent";
import { SimpleMemory } from "@devscalelabs/kine/memory";
import { defineTool } from "@devscalelabs/kine/tool";
import { z } from "zod";
import "dotenv/config";

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
		// Generate random weather conditions
		const conditions = [
			"sunny",
			"cloudy",
			"rainy",
			"partly cloudy",
			"overcast",
			"stormy",
		];
		const randomCondition =
			conditions[Math.floor(Math.random() * conditions.length)];

		// Generate random temperature variation (-5 to +5 degrees)
		const baseTemp = units === "celsius" ? 22 : 72;
		const tempVariation = Math.floor(Math.random() * 11) - 5;
		const randomTemp = baseTemp + tempVariation;

		// Generate random humidity (40-80%)
		const randomHumidity = Math.floor(Math.random() * 41) + 40;

		return {
			location: location,
			temperature: randomTemp,
			condition: randomCondition,
			humidity: randomHumidity,
		};
	},
});

async function main() {
	const memory = new SimpleMemory({
		maxMessages: 100,
		maxSteps: 50,
	});

	const agent = new Agent({
		id: "AI Agent",
		model: "meta-llama/llama-4-maverick",
		tools: [getWeather],
		memory: memory,
	});

	const response = await agent.run(
		"What's the weather like in New York in Celcius and Tokyo in Fahrenheit?",
	);
	console.log(response.response);

	console.log("\n=== MEMORY CONVERSATION HISTORY ===");
	console.log(JSON.stringify(memory.toConversationHistory(), null, 2));
}

main().catch(console.error);
