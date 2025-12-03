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

const calculateTip = defineTool({
	id: "calculate_tip",
	description: "Calculate tip amount for a bill",
	input: z.object({
		bill_amount: z.number().describe("Total bill amount"),
		tip_percentage: z
			.number()
			.optional()
			.default(15)
			.describe("Tip percentage"),
	}),
	output: z.object({
		tip_amount: z.number(),
		total_amount: z.number(),
	}),
	execute: async ({ bill_amount, tip_percentage }) => {
		const tip_amount = bill_amount * (tip_percentage / 100);
		const total_amount = bill_amount + tip_amount;

		return {
			tip_amount: Math.round(tip_amount * 100) / 100,
			total_amount: Math.round(total_amount * 100) / 100,
		};
	},
});

export async function example04() {
	const memory = new SimpleMemory({
		maxMessages: 100,
		maxSteps: 50,
	});

	const agent = new Agent({
		id: "Conversational Assistant",
		model: "deepseek/deepseek-v3.2-speciale",
		tools: [getWeather, calculateTip],
		memory: memory,
	});

	console.log("🤖 Starting conversational agent...\n");

	const conversations = [
		"Hi! What's your name and what can you help me with?",
		"What's the weather like in Tokyo?",
		"That's interesting! Can you also tell me the weather in London in Celsius?",
		"Thanks! Now I need help with something else. If my restaurant bill is $85, what would be a 20% tip?",
		"Perfect! And what would be the total amount including the tip?",
		"You've been very helpful today. Can you summarize what we discussed?",
	];

	for (let i = 0; i < conversations.length; i++) {
		const userMessage = conversations[i];
		console.log(`👤 User [${i + 1}]: ${userMessage}`);

		console.log("🤔 Assistant is thinking...");

		const stream = agent.runStreaming(userMessage);

		let result;

		while (!(result = await stream.next()).done) {
			const step = result.value;
			if (step.content) {
				console.log(`   💭 ${step.content}`);
			}
			if (step.action && step.action !== "finalize") {
				console.log(`   🔧 Using tool: ${step.action}`);
			}
			if (
				step.result !== undefined &&
				step.result !== "pending" &&
				step.action !== "finalize"
			) {
				console.log(`   📊 Result: ${JSON.stringify(step.result)}`);
			}
		}

		const finalResponse = result.value;
		console.log(`🤖 Assistant: ${finalResponse.getFinalAnswer()}\n`);

		if (i < conversations.length - 1) {
			console.log("---\n");
		}
	}

	console.log("📊 Conversation Summary:");
	console.log(`Total messages exchanged: ${memory.getMessages().length}`);
	console.log(`Total steps executed: ${memory.getSteps().length}`);
	console.log(
		`Token usage: ${JSON.stringify(memory.getTokenUsage(), null, 2)}`,
	);
}
