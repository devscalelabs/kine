import "dotenv/config";
import { Agent } from "@devscalelabs/kine/agent";
import { userMessage } from "@devscalelabs/kine/messages";
import { defineTool } from "@devscalelabs/kine/tools";
import { z } from "zod";

const todoList: { id: number; task: string; completed: boolean }[] = [
	{ id: 1, task: "Buy groceries", completed: false },
	{ id: 2, task: "Walk the dog", completed: true },
	{ id: 3, task: "Finish project", completed: false },
];

const todoTools = [
	defineTool({
		name: "get_todo_list",
		description: "Retrieves the current todo list",
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
		description: "Adds a new task to the todo list",
		inputSchema: z.object({
			task: z.string().describe("Task to add"),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			newTodo: z.object({
				id: z.number(),
				task: z.string(),
				completed: z.boolean(),
			}),
		}),
		execute: async ({ input }) => {
			const newId = Math.max(...todoList.map((t) => t.id), 0) + 1;
			const newTodo = {
				id: newId,
				task: input.task,
				completed: false,
			};
			todoList.push(newTodo);
			return { success: true, newTodo };
		},
	}),
	defineTool({
		name: "complete_todo",
		description: "Marks a task as completed",
		inputSchema: z.object({
			id: z.number().describe("ID of task to complete"),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			completedTodo: z
				.object({
					id: z.number(),
					task: z.string(),
					completed: z.boolean(),
				})
				.optional(),
		}),
		execute: async ({ input }) => {
			const todoIndex = todoList.findIndex((t) => t.id === input.id);
			if (todoIndex === -1) {
				return { success: false };
			}
			todoList[todoIndex].completed = true;
			return { success: true, completedTodo: todoList[todoIndex] };
		},
	}),
];

async function main() {
	const agent = new Agent({
		instruction:
			"You are a helpful todo list manager. Use the appropriate tool based on the user's request.",
		tools: todoTools,
	});

	const response = await agent.run({
		messages: [userMessage("Show me my todo list")],
	});

	console.log(response);
}

main().catch(console.error);
