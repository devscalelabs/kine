import "dotenv/config";
import { Agent, simpleMemory, userMessage } from "@simpleagent/core";
import { defineTool } from "@simpleagent/core/tools";
import { z } from "zod";

const NoteInputSchema = z.object({
	title: z.string().describe("The title of the note"),
	content: z.string().describe("The content of the note"),
});

const NoteOutputSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	noteId: z.string().optional(),
});

const noteStorage: Map<string, { title: string; content: string }> = new Map();

const noteTool = defineTool({
	name: "save_note",
	description: "Save a note with title and content",
	inputSchema: NoteInputSchema,
	outputSchema: NoteOutputSchema,
	execute: async ({ input }) => {
		const { title, content } = input;
		const noteId = Date.now().toString();
		noteStorage.set(noteId, { title, content });

		console.log(`[NoteTool] Saved note: ${title}`);
		return {
			success: true,
			message: `Note "${title}" saved successfully`,
			noteId,
		};
	},
});

async function main() {
	const memory = simpleMemory();
	const agent = new Agent({
		memory: memory,
		tools: [noteTool],
		instruction:
			"You are a helpful assistant that can save notes and remember conversations. When users ask you to remember something, use the save_note tool.",
	});

	console.log("=== Memory + Tools Demo ===");

	try {
		// First interaction - save a note
		console.log("\n1. Saving a note...");
		const result1 = await agent.run({
			messages: [
				userMessage(
					"Please save a note with title 'Shopping List' and content 'milk, eggs, bread'",
				),
			],
		});
		console.log("Agent response:", result1);

		// Second interaction - ask about the note
		console.log("\n2. Asking about the note...");
		const result2 = await agent.run({
			messages: [userMessage("What did I ask you to remember earlier?")],
		});
		console.log("Agent response:", result2);

		// Third interaction - save another note
		console.log("\n3. Saving another note...");
		const result3 = await agent.run({
			messages: [
				userMessage(
					"Save another note: title 'Meeting', content 'Team meeting at 3pm tomorrow'",
				),
			],
		});
		console.log("Agent response:", result3);

		// Fourth interaction - ask about all notes
		console.log("\n4. Asking about all notes...");
		const result4 = await agent.run({
			messages: [userMessage("Can you summarize all the notes we've created?")],
		});
		console.log("Agent response:", result4);

		// Show final memory state
		console.log("\n=== Final Memory Contents ===");
		const messages = memory.getMessages();
		messages.forEach((msg, index) => {
			console.log(`${index + 1}. [${msg.role}]: ${msg.content}`);
		});
	} catch (error) {
		console.error("Error running agent:", error);
	}
}

main().catch(console.error);
