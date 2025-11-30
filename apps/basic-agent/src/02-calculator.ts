import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";
import { userMessage } from "@devscalelabs/kine/messages";
import { calculatorTool } from "@devscalelabs/kine/tools/calculator";

async function main() {
	const agent = new Agent({
		instruction:
			"You are a precise mathematical assistant. Always show your work and double-check calculations before providing the final answer.",
		tools: [calculatorTool],
	});

	const response = await agent.run({
		messages: [userMessage("What is 15 + 27?")],
	});

	console.log(response);
}

main().catch(console.error);
