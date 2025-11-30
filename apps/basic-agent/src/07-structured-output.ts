import { Agent } from "@devscalelabs/kine";
import { z } from "zod";

const agent = new Agent({
	debug: true,
	model: "meituan/longcat-flash-chat",
});

// Define a structured output schema using Zod
const WeatherSchema = z.object({
	location: z.string().describe("The location being queried"),
	temperature: z.number().describe("Temperature in Celsius"),
	condition: z.string().describe("Weather condition (e.g. sunny, rainy)"),
	humidity: z.number().describe("Humidity percentage"),
});

async function main() {
	const response = await agent.run({
		messages: [
			{
				role: "user",
				content:
					"Give me weather information for Tokyo, Japan. Return it in the structured format.",
			},
		],
		zodSchema: WeatherSchema,
	});

	console.log("Weather data:", response);
}

main().catch(console.error);
