import "dotenv/config";
import { Agent, userMessage } from "@simpleagent/core";
import { defineTool } from "@simpleagent/core/tools";
import { z } from "zod";

const WeatherInputSchema = z.object({
	location: z.string().describe("The city and state, e.g. San Francisco, CA"),
	unit: z
		.enum(["celsius", "fahrenheit"])
		.optional()
		.describe("The temperature unit"),
});

const WeatherOutputSchema = z.object({
	temperature: z.number(),
	unit: z.string(),
	location: z.string(),
});

const weatherTool = defineTool({
	name: "get_weather",
	description: "Get the current weather in a given location",
	inputSchema: WeatherInputSchema,
	outputSchema: WeatherOutputSchema,
	execute: async ({ input }) => {
		const { location, unit = "celsius" } = input;
		console.log(`[WeatherTool] Getting weather for ${location} in ${unit}`);

		// Mock response
		return {
			temperature: 22,
			unit: unit,
			location: location,
		};
	},
});

async function main() {
	const agent = new Agent({
		tools: [weatherTool],
	});

	console.log("Running weather example...");
	try {
		const result = await agent.run({
			messages: [userMessage("What is the weather in New York?")],
		});
		console.log("Agent response:", result);
	} catch (error) {
		console.error("Error running agent:", error);
	}
}

main().catch(console.error);
