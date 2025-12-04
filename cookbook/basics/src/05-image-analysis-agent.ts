import { Agent } from "@devscalelabs/kine/agent";
import { SimpleMemory } from "@devscalelabs/kine/memory";
import type { MultimodalContent } from "@devscalelabs/kine/types";

export async function example05() {
	const memory = new SimpleMemory({
		maxMessages: 100,
		maxSteps: 50,
	});

	const agent = new Agent({
		id: "Image Analysis Assistant",
		model: "x-ai/grok-4.1-fast", // Vision-capable model
		memory: memory,
	});

	// Example: Simplified multimodal input
	console.log("🔍 Analyzing image with simplified format...");

	const imageUrl =
		"https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg";

	const multimodalContent: MultimodalContent = {
		text: "Please analyze this image in detail. What do you see? Describe the scene, objects, colors, and overall mood.",
		images: [imageUrl], // Simple array of image URLs
	};

	const response = await agent.run(multimodalContent);

	// Display analysis
	console.log("\n🤖 Image Analysis Results:");
	console.log(response.getFinalAnswer());

	// Display execution details
	console.log("\n📊 Execution Details:");
	console.log(response.beautify());

	// Show memory usage
	console.log("\n💾 Memory Usage:");
	console.log(JSON.stringify(memory.getStats(), null, 2));
}

// Run the example when this file is executed directly
example05().catch(console.error);
