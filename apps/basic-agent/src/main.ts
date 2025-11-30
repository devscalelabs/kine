import "dotenv/config";

import { Agent } from "@devscalelabs/kine/agent";

async function main() {
	const agent = new Agent({
		id: "AI Agent",
		model: "x-ai/grok-code-fast-1",
		baseURL: process.env.OPENAI_BASE_URL!,
		apiKey: process.env.OPENAI_API_KEY!,
	});

	const response = await agent.run("Hello! Can you introduce yourself?");
	console.log(response.response);
}

main().catch(console.error);
