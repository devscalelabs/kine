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

export async function example03() {
	const memory = new SimpleMemory({
		maxMessages: 100,
		maxSteps: 50,
	});

	const agent = new Agent({
		id: "Streaming Weather Agent",
		model: "openai/gpt-oss-120b",
		tools: [getWeather],
		memory: memory,
	});

	const prompt =
		"Give me the weather in Jakarta in Celsius and San Francisco in Fahrenheit.";

	console.log("Starting streaming run...");

	const stream = agent.runStreaming(prompt);

	// Manually iterate to capture the final return value
	let result;
	while (!(result = await stream.next()).done) {
		const step = result.value;
		if (step.content) {
			console.log(`[STREAM] Thought: ${step.content}`);
		}
		if (step.action) {
			console.log(`[STREAM] Action: ${step.action}`);
		}
		if (step.result !== undefined && step.result !== "pending") {
			console.log(`[STREAM] Result:`, step.result);
		}
	}

	// The final value is the Response object
	const finalResponse = result.value;

	console.log("\n=== Final Response ===");
	console.log(finalResponse.getFinalAnswer());

	console.log("\n=== Token Usage ===");
	console.log(finalResponse.getTokenUsage());

	console.log("\n=== Beautified Response ===");
	console.log(finalResponse.beautify());
}

// Run the example when this file is executed directly
example03().catch(console.error);
