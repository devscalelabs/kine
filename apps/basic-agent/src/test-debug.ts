import { Agent } from "@devscalelabs/kine/agent";
import { defineTool } from "@devscalelabs/kine/tool";
import { z } from "zod";

const simpleTool = defineTool({
	id: "simple_tool",
	description: "A simple test tool",
	input: z.object({
		message: z.string().describe("A message to process"),
	}),
	output: z.object({
		response: z.string(),
	}),
	execute: async ({ message }) => {
		return {
			response: `Processed: ${message}`,
		};
	},
});

export async function testDebugUI() {
	const agent = new Agent({
		id: "Test Agent",
		model: "openai/gpt-oss-120b",
		tools: [simpleTool],
		debug: true,
	});

	console.log("Testing debug UI...");

	const runner = await agent.run(
		"Use the simple tool with message 'Hello World'",
	);

	console.log("Final answer:", runner.getFinalAnswer());
	console.log("\nNow launching debug UI...");

	// Get the debug logger from the agent (we need to access it somehow)
	// For now, call debug without the logger
	runner.debug();
}

testDebugUI().catch(console.error);
