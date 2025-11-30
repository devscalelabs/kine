import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";
import { userMessage } from "@devscalelabs/kine/messages";
import { defineTool } from "@devscalelabs/kine/tools";
import { z } from "zod";

const database: Record<string, any> = {
	users: [
		{ id: 1, name: "Alice", email: "alice@example.com", age: 30 },
		{ id: 2, name: "Bob", email: "bob@example.com", age: 25 },
		{ id: 3, name: "Charlie", email: "charlie@example.com", age: 35 },
	],
};

const dataTools = [
	defineTool({
		name: "get_user",
		description: "Retrieves a user by ID",
		inputSchema: z.object({
			id: z.number().describe("User ID to retrieve"),
		}),
		outputSchema: z.object({
			user: z.object({
				id: z.number(),
				name: z.string(),
				email: z.string(),
				age: z.number(),
			}),
		}),
		execute: async ({ input }) => {
			const user = database.users.find((u: any) => u.id === input.id);
			if (!user) {
				throw new Error(`User with ID ${input.id} not found`);
			}
			return { user };
		},
	}),
	defineTool({
		name: "update_user",
		description: "Updates a user's information",
		inputSchema: z.object({
			id: z.number().describe("User ID to update"),
			name: z.string().optional().describe("New name"),
			email: z.string().optional().describe("New email"),
			age: z.number().optional().describe("New age"),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			user: z.object({
				id: z.number(),
				name: z.string(),
				email: z.string(),
				age: z.number(),
			}),
		}),
		execute: async ({ input }) => {
			const userIndex = database.users.findIndex((u: any) => u.id === input.id);
			if (userIndex === -1) {
				throw new Error(`User with ID ${input.id} not found`);
			}

			const updatedUser = {
				...database.users[userIndex],
				...(input.name && { name: input.name }),
				...(input.email && { email: input.email }),
				...(input.age && { age: input.age }),
			};

			database.users[userIndex] = updatedUser;
			return { success: true, user: updatedUser };
		},
	}),
];

async function main() {
	const agent = new Agent({
		instruction:
			"You are a helpful data manager assistant. Use the appropriate tool based on the user's request.",
		tools: dataTools,
	});

	const response = await agent.run({
		messages: [userMessage("Get user with ID 1")],
	});

	console.log(response);
}

main().catch(console.error);
