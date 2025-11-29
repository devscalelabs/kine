import { Agent } from "@kine/core";
import { z } from "zod";

const agent = new Agent({
	debug: true,
});

// Define a structured output schema using Zod
const WeatherSchema = z.object({
	location: z.string().describe("The location being queried"),
	temperature: z.number().describe("Temperature in Celsius"),
	conditions: z
		.string()
		.describe("Weather conditions like sunny, cloudy, rainy"),
	humidity: z.number().describe("Humidity percentage"),
});

async function testStructuredOutput() {
	console.log("Testing structured output with Zod schema...");

	const result = await agent.run({
		messages: [
			{
				role: "user",
				content:
					"What's the weather like in Tokyo today? It's 22°C, partly cloudy with 65% humidity.",
			},
		],
		zodSchema: WeatherSchema,
	});

	console.log("\n=== STRUCTURED RESULT ===");
	console.log(result);
}


async function main() {
	await testStructuredOutput();
}

main().catch(console.error);
