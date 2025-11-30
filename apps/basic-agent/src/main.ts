import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";

async function main() {
    // Create a simple agent with minimal configuration
    const agent = new Agent({
        model: "gpt-4o-mini",
        debug: true,
    });

    console.log("=== Ultra Simple LLM Agent Demo ===\n");

    // Example 1: Simple prompt
    console.log("1. Simple prompt:");
    const response1 = await agent.run("Hello! Can you introduce yourself?");
    console.log("Response:", response1);
    console.log();

    // Example 2: Question and answer
    console.log("2. Question and answer:");
    const response2 = await agent.run("What is the capital of France?");
    console.log("Response:", response2);
    console.log();

    // Example 3: Streaming response
    console.log("3. Streaming response:");
    const stream = agent.runStream("Tell me a very short joke.");

    console.log("Streaming response:");
    for await (const chunk of stream) {
        process.stdout.write(chunk);
    }
    console.log("\n");

    // Example 4: Using different model
    console.log("4. Using different model (GPT-4o):");
    const gpt4Agent = new Agent({
        model: "gpt-4o",
        debug: false,
    });

    const response4 = await gpt4Agent.run("Write a haiku about coding.");
    console.log("Response:", response4);
}

main().catch(console.error);
