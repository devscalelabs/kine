import { Agent } from "@devscalelabs/kine/agent";
import { SimpleMemory } from "@devscalelabs/kine/memory";
import { defineTool } from "@devscalelabs/kine/tool";
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

		const baseTemp = units === "celsius" ? 22 : 72;
		const tempVariation = Math.floor(Math.random() * 11) - 5;
		const randomTemp = baseTemp + tempVariation;

		const randomHumidity = Math.floor(Math.random() * 41) + 40;

		return {
			location: location,
			temperature: randomTemp,
			condition: randomCondition,
			humidity: randomHumidity,
		};
	},
});

export async function example01() {
	const memory = new SimpleMemory({
		maxMessages: 100,
		maxSteps: 50,
	});

	const agent = new Agent({
		id: "AI Agent",
		model: "qwen/qwen3-30b-a3b-instruct-2507",
		tools: [getWeather],
		memory: memory,
	});

	const response = await agent.run(
		"What's the weather like in New York in Celcius and Tokyo in Fahrenheit?",
	);

	// Final answer
	console.log(response.getFinalAnswer());

	// Token usage (aggregate)
	console.log("\nToken Usage:", response.getTokenUsage());

	// Memory steps with metadata (tokens, latency, model, etc.)
	console.log("\nMemory Steps:");
	console.log(JSON.stringify(memory.getSteps(), null, 2));

	// Or use beautify() for full formatted output with tokens
	console.log(response.beautify());
}

// Run the example when this file is executed directly
example01().catch(console.error);
