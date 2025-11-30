import "dotenv/config";
import { defineTool } from "@devscalelabs/kine";
import { Agent } from "@devscalelabs/kine/agent";
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
	const agent = new Agent({
		id: "AI Agent",
		model: "openai/gpt-oss-120b:exacto",
		tools: [getWeather],
	});

	const response = await agent.run(
		"What's the weather like in New York in Celcius and Tokyo in Fahrenheit?",
	);
	console.log(response.response);
}

main().catch(console.error);
