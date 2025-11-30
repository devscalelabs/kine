import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";
import { userMessage } from "@devscalelabs/kine/messages";
import { defineTool } from "@devscalelabs/kine/tools";
import { z } from "zod";

const WeatherInputSchema = z.object({
	location: z.string().describe("The city and state, e.g. San Francisco, CA"),
	unit: z
		.enum(["celsius", "fahrenheit"])
		.optional()
		.describe("Temperature unit"),
});

const WeatherOutputSchema = z.object({
	location: z.string(),
	temperature: z.number(),
	unit: z.enum(["celsius", "fahrenheit"]),
	condition: z.string(),
	humidity: z.number(),
});

const weatherTool = defineTool({
	name: "get_weather",
	description: "Get weather information for a location",
	inputSchema: WeatherInputSchema,
	outputSchema: WeatherOutputSchema,
	execute: async ({ input }) => {
		// Mock weather data for demonstration
		const mockWeatherData = {
			location: input.location,
			temperature: 22,
			unit: input.unit || "celsius",
			condition: "partly cloudy",
			humidity: 65,
		};
		return mockWeatherData;
	},
});

async function main() {
	const agent = new Agent({
		instruction:
			"You are a helpful weather assistant. Always provide accurate weather information using the get_weather tool.",
		tools: [weatherTool],
	});

	const response = await agent.run({
		messages: [userMessage("What's the weather like in Paris?")],
	});

	console.log(response);
}

main().catch(console.error);
