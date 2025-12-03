import "dotenv/config";

// import { example01 } from "./example01";
// import { example02 } from "./example02";
// import { example03 } from "./example03";
// import { example04 } from "./example04";
import { testDebugUI } from "./test-debug";

async function main() {
	// console.log("Running Example 01: Weather Agent");
	// await example01();
	// console.log("Running Example 02: Calculator Agent");
	// await example02();
	// console.log("Running Example 03: Streaming Weather Agent");
	// await example03();
	// console.log("Running Example 04: Streaming Conversation Agent");
	// await example04();
	console.log("Testing Debug UI");
	await testDebugUI();
}

main().catch(console.error);
