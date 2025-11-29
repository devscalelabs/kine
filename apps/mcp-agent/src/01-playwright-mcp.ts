import { Agent } from "@kine/core";

/**
 * Example: Playwright MCP Integration
 *
 * This example demonstrates how to use MCP tools to interact with web browsers
 * using Playwright for web automation and scraping.
 */

async function playwrightMCPExample() {
	console.log("🎭 Playwright MCP Example");
	console.log("==========================");

	// Initialize agent with Playwright MCP
	const agent = new Agent({
		debug: true,
		model: "google/gemini-3-pro-preview",
		instruction:
			"You are a web automation assistant that can control browsers, take screenshots, and extract data from websites using Playwright.",
	});

	try {
		// Register Playwright MCP server using stdio transport
		await agent.registerMCP([
			{
				command: "npx.cmd",
				args: ["@playwright/mcp@latest"],
				serverLabel: "playwright",
				allowedTools: [
					"playwright_navigate",
					"playwright_screenshot",
					"playwright_click",
					"playwright_type",
					"playwright_extract",
					"browser_snapshot"
				],
			},
			{
				command: "npx.cmd",
				args: [
					"-y",
					"@modelcontextprotocol/server-filesystem",
					process.cwd(),
				],
				serverLabel: "filesystem",
			},
		]);

		console.log("✅ Playwright MCP tools registered successfully");

		// Example queries
		const queries = [
			"Navigate to https://indrazm.com and take a screenshot",
			"Save the screenshot to the current directory",
		];

		for (const query of queries) {
			console.log(`\n🔍 Query: ${query}`);
			console.log("-".repeat(60));

			const result = await agent.run({
				messages: [{ role: "user", content: query }],
			});

			console.log(`📋 Result: ${result}`);
		}
	} catch (error) {
		console.error("❌ Error in Playwright MCP example:", error);
		console.log("\n💡 Make sure to:");
		console.log("   1. Install @playwright/mcp package");
		console.log(
			"   2. The MCP server will be started automatically when needed",
		);
		console.log(
			"   3. Browser automation requires proper setup and permissions",
		);
	}
}

// Run the example
playwrightMCPExample().catch(console.error);
