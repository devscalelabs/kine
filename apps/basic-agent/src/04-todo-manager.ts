import "dotenv/config";
import { Agent } from "@kine/core/agent";
import { userMessage } from "@kine/core/messages";
import { defineTool } from "@kine/core/tools";
import { z } from "zod";

const todoList: { id: number; task: string; completed: boolean }[] = [
	{ id: 1, task: "Buy groceries", completed: false },
	{ id: 2, task: "Walk the dog", completed: true },
	{ id: 3, task: "Finish project", completed: false },
];

const todoTools = [
	defineTool({
		name: "list_todos",
		description: "Lists all todo items",
		inputSchema: z.object({}),
		outputSchema: z.object({
			todos: z.array(
				z.object({
					id: z.number(),
					task: z.string(),
					completed: z.boolean(),
				}),
			),
		}),
		execute: async () => {
			return { todos: todoList };
		},
	}),

	defineTool({
		name: "add_todo",
		description: "Adds a new todo item",
		inputSchema: z.object({
			task: z.string().describe("Task description"),
		}),
		outputSchema: z.object({
			id: z.number(),
			task: z.string(),
			completed: z.boolean(),
		}),
		execute: async ({ input }) => {
			const newTodo = {
				id: Math.max(...todoList.map((t) => t.id), 0) + 1,
				task: input.task,
				completed: false,
			};
			todoList.push(newTodo);
			return newTodo;
		},
	}),

	defineTool({
		name: "complete_todo",
		description: "Marks a todo as completed",
		inputSchema: z.object({
			id: z.number().describe("Todo ID to complete"),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			todo: z.object({
				id: z.number(),
				task: z.string(),
				completed: z.boolean(),
			}),
		}),
		execute: async ({ input }) => {
			const todo = todoList.find((t) => t.id === input.id);
			if (!todo) {
				throw new Error("Todo not found");
			}
			todo.completed = true;
			return { success: true, todo };
		},
	}),
];

async function main() {
	const agent = new Agent({
		instruction:
			"You are a productive task management assistant. Always prioritize tasks logically and suggest next steps when managing todos.",
		tools: todoTools,
	});

	console.log("Running todo manager example...");
	try {
		const result = await agent.run({
			messages: [
				userMessage(
					"Show me all todos, then add 'Call mom' to the list, and mark todo 1 as completed",
				),
			],
		});
		console.log("Agent response:", result);
	} catch (error) {
		console.error("Error:", error);
	}
}

main().catch(console.error);
