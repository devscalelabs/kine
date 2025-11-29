import "dotenv/config";
import { Agent, userMessage } from "@simpleagent/core";
import {
	listDirectoryTool,
	readFileTool,
	writeFileTool,
} from "@simpleagent/core/tools/filesystem";

async function main() {
	const agent = new Agent({
		instruction:
			"You are a file system assistant. You can read files, write files, and list directory contents. Always be careful when writing files and explain what you're doing.",
		tools: [readFileTool, writeFileTool, listDirectoryTool],
	});

	console.log("Running filesystem example...");
	try {
		const result = await agent.run({
			messages: [
				userMessage(
					"List the contents of the current directory and read the package.json file",
				),
			],
		});
		console.log("Agent response:", result);
	} catch (error) {
		console.error("Error:", error);
	}
}

main().catch(console.error);
