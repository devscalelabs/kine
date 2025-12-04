import "dotenv/config";

// import { example01 } from "./example01";
// import { example02 } from "./example02";
// import { example03 } from "./example03";
// import { example04 } from "./example04";
import { example05 } from "./example05";

async function main() {
	// console.log("Running Example 01: Weather Agent");
	// await example01();
	// console.log("Running Example 02: Calculator Agent");
	// await example02();
	// console.log("Running Example 03: Streaming Weather Agent");
	// await example03();
	// console.log("Running Example 04: Streaming Conversation Agent");
	// await example04();
	console.log("Running Example 05: Image Analysis Agent");
	await example05();
}

main().catch(console.error);
