import "dotenv/config";
import { Agent, simpleMemory, userMessage } from "@simpleagent/core";

async function main() {
	const memory = simpleMemory();
	const agent = new Agent({
		memory: memory,
		instruction:
			"You are a helpful chat assistant. Remember our conversations and refer back to them when relevant.",
	});

	console.log("=== Interactive Chat Demo ===");
	console.log("Type 'quit' to exit, 'memory' to show conversation history\n");

	let conversationActive = true;

	while (conversationActive) {
		const userInput = await new Promise<string>((resolve) => {
			process.stdout.write("You: ");
			process.stdin.once("data", (data) => {
				resolve(data.toString().trim());
			});
		});

		if (userInput.toLowerCase() === "quit") {
			conversationActive = false;
			continue;
		}

		if (userInput.toLowerCase() === "memory") {
			console.log("\n=== Conversation History ===");
			const messages = memory.getMessages();
			messages.forEach((msg, index) => {
				console.log(`${index + 1}. [${msg.role}]: ${msg.content}`);
			});
			console.log();
			continue;
		}

		try {
			const result = await agent.run({
				messages: [userMessage(userInput)],
			});
			console.log(`Assistant: ${result}\n`);
		} catch (error) {
			console.error("Error:", error);
		}
	}

	console.log("Goodbye!");
}

// Enable stdin for interactive input
process.stdin.resume();
process.stdin.setEncoding("utf8");

main().catch(console.error);
