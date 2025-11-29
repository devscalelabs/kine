import "dotenv/config";
import { Agent, userMessage } from "@kine/core";
import { defineTool } from "@kine/core/tools";
import { z } from "zod";

const database: Record<string, any> = {
	users: [
		{ id: 1, name: "Alice", email: "alice@example.com", age: 30 },
		{ id: 2, name: "Bob", email: "bob@example.com", age: 25 },
		{ id: 3, name: "Charlie", email: "charlie@example.com", age: 35 },
	],
	products: [
		{
			id: 1,
			name: "Laptop",
			price: 999.99,
			category: "Electronics",
			stock: 10,
		},
		{ id: 2, name: "Book", price: 19.99, category: "Books", stock: 50 },
		{ id: 3, name: "Coffee Mug", price: 12.99, category: "Kitchen", stock: 25 },
	],
};

const dataTools = [
	defineTool({
		name: "query_table",
		description: "Queries data from a specific table",
		inputSchema: z.object({
			table: z.enum(["users", "products"]).describe("Table to query"),
			filter: z
				.string()
				.optional()
				.describe("Filter condition (e.g., 'age > 25')"),
		}),
		outputSchema: z.object({
			data: z.array(z.any()),
			count: z.number(),
		}),
		execute: async ({ input }) => {
			let data = database[input.table] || [];

			if (input.filter) {
				// Simple filter parsing for demonstration
				if (input.filter.includes("age >")) {
					const age = parseInt(input.filter.split(">")[1].trim(), 10);
					data = data.filter((item: any) => item.age > age);
				} else if (input.filter.includes("category =")) {
					const category = input.filter
						.split("=")[1]
						.trim()
						.replace(/['"]/g, "");
					data = data.filter((item: any) => item.category === category);
				}
			}

			return { data, count: data.length };
		},
	}),

	defineTool({
		name: "create_record",
		description: "Creates a new record in a table",
		inputSchema: z.object({
			table: z.enum(["users", "products"]).describe("Table to insert into"),
			data: z.record(z.string(), z.any()).describe("Record data"),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			id: z.number(),
		}),
		execute: async ({ input }) => {
			const table = database[input.table];
			if (!table) {
				throw new Error("Table not found");
			}

			const newId = Math.max(...table.map((item: any) => item.id), 0) + 1;
			const newRecord = { id: newId, ...input.data };
			table.push(newRecord);

			return { success: true, id: newId };
		},
	}),

	defineTool({
		name: "calculate_stats",
		description: "Calculates statistics on table data",
		inputSchema: z.object({
			table: z.enum(["users", "products"]).describe("Table to analyze"),
			operation: z
				.enum(["avg", "sum", "count", "min", "max"])
				.describe("Statistical operation"),
			field: z.string().describe("Field to calculate on"),
		}),
		outputSchema: z.object({
			result: z.number(),
			operation: z.string(),
			field: z.string(),
		}),
		execute: async ({ input }) => {
			const data = database[input.table] || [];
			const values = data
				.map((item: any) => item[input.field])
				.filter((val: any) => typeof val === "number");

			let result: number;
			switch (input.operation) {
				case "avg":
					result =
						values.reduce((a: number, b: number) => a + b, 0) / values.length;
					break;
				case "sum":
					result = values.reduce((a: number, b: number) => a + b, 0);
					break;
				case "count":
					result = values.length;
					break;
				case "min":
					result = Math.min(...values);
					break;
				case "max":
					result = Math.max(...values);
					break;
				default:
					throw new Error("Unknown operation");
			}

			return { result, operation: input.operation, field: input.field };
		},
	}),
];

async function main() {
	const agent = new Agent({
		instruction:
			"You are a data analyst assistant. Always provide insights about the data patterns and suggest meaningful analyses when working with databases.",
		tools: dataTools,
	});

	console.log("Running data management example...");
	try {
		const result = await agent.run({
			messages: [
				userMessage(
					"Show me all users older than 25, then calculate the average age of all users, and finally add a new user named David with age 28",
				),
			],
		});
		console.log("Agent response:", result);
	} catch (error) {
		console.error("Error:", error);
	}
}

main().catch(console.error);
