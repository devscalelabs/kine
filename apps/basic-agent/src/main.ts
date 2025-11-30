import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";

async function main() {
    const agent = new Agent({
        model: "gpt-4o-mini",
    });

    console.log("1. Simple prompt:");
    const response1 = await agent.run("Hello! Can you introduce yourself?");
    console.log("Response:", response1);
}

main().catch(console.error);
