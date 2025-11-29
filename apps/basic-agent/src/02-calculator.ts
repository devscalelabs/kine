import "dotenv/config";
import { Agent } from "@kine/core/agent";
import { userMessage } from "@kine/core/messages";
import { calculatorTool } from "@kine/core/tools/calculator";

async function main() {
	const agent = new Agent({
		instruction:
			"You are a precise mathematical assistant. Always show your work and double-check calculations before providing the final answer.",
		tools: [calculatorTool],
	});

	console.log("Running calculator example...");
	try {
		const result = await agent.run({
			messages: [userMessage("What is 15 plus 27?")],
		});
		console.log("Agent response:", result);
	} catch (error) {
		console.error("Error:", error);
	}
}

main().catch(console.error);
