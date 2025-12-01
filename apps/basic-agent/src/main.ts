import "dotenv/config";

import { example01 } from "./example01";
import { example02 } from "./example02";

async function main() {
	console.log("Running Example 01: Weather Agent");
	await example01();

	console.log("Running Example 02: Calculator Agent");
	await example02();
}

main().catch(console.error);
