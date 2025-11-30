import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";
import { userMessage } from "@devscalelabs/kine/messages";
import {
	listDirectoryTool,
	readFileTool,
	writeFileTool,
} from "@devscalelabs/kine/tools/filesystem";

async function main() {
	const agent = new Agent({
		instruction:
			"You are a helpful file system assistant. Use the appropriate file system tool based on the user's request.",
		tools: [listDirectoryTool, readFileTool, writeFileTool],
	});

	const response = await agent.run({
		messages: [userMessage("List the files in the current directory")],
	});

	console.log(response);
}

main().catch(console.error);
