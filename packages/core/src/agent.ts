import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { MemoryInterface } from "./memory";
import type { Message } from "./messages";
import type { ToolInterface } from "./tools";
import type { z } from "zod";

export interface AgentConfig {
	model?: string;
	apiKey?: string;
	tools?: ToolInterface[];
	maxIterations?: number;
	instruction?: string | undefined;
	memory?: MemoryInterface;
	debug?: boolean;
}

export interface AgentRunInput {
	messages: Message[];
	zodSchema?: z.ZodSchema<any>;
}

export class Agent {
	private openai: OpenAI;
	private tools: Map<string, ToolInterface> = new Map();
	private model: string;
	private maxIterations: number;
	private instruction: string | undefined;
	private memory: MemoryInterface | undefined;
	private debug: boolean;

	constructor(config: AgentConfig = {}) {
		this.model = config.model || "gpt-5-mini-2025-08-07";
		this.maxIterations = config.maxIterations || 10;
		this.instruction = config.instruction;
		this.memory = config.memory;
		this.debug = process.env.DEBUG === "true" || config.debug || false;
		this.openai = new OpenAI({
			apiKey: config.apiKey || process.env.OPENAI_API_KEY,
		});

		if (config.tools) {
			this.registerTools(config.tools);
		}
	}

	registerTool(tool: ToolInterface): void {
		this.tools.set(tool.name, tool);
	}

	registerTools(tools: ToolInterface[]): void {
		tools.forEach((tool) => {
			this.registerTool(tool);
		});
	}

	private createSystemPrompt(): string {
		return this.instruction || "";
	}

	private createDeveloperPrompt(): string {
		const toolDescriptions = Array.from(this.tools.values())
			.map((tool) => `${tool.name}: ${tool.description}`)
			.join("\n");

		const toolFramework = `You are an AI agent capable of using tools.

Available tools:
${toolDescriptions}

To use a tool, please use the following format:
THOUGHT: <reasoning>
ACTION: <tool_name>:<json_input>

When you have the final answer:
FINAL_ANSWER: <answer>

Always think step by step.

IMPORTANT: For tool input, use JSON format. For example: ACTION: hello:{"name": "Alice"}`;

		return this.instruction
			? `${toolFramework}

${this.instruction}`
			: toolFramework;
	}

	async run(input: AgentRunInput): Promise<string | any> {
		// Add input messages to memory if available
		if (this.memory) {
			for (const message of input.messages) {
				this.memory.addMessage(message);
			}
		}

		// If structured output is requested, use direct parsing without agent framework
		if (input.zodSchema) {
			const messages = [
				{ role: "system" as const, content: this.createSystemPrompt() },
				...input.messages.filter(
					(m) => m.role === "user" || m.role === "assistant",
				),
			];

			const response = await this.openai.chat.completions.parse({
				model: this.model,
				messages: messages,
				response_format: zodResponseFormat(input.zodSchema, "response"),
			});

			const message = response.choices[0]?.message;
			const parsedMessage = message as any;

			if (parsedMessage?.parsed) {
				const result = parsedMessage.parsed;
				if (this.memory) {
					this.memory.addMessage({
						role: "assistant",
						content: JSON.stringify(result),
					});
				}
				return result;
			} else {
				return "Failed to parse structured response";
			}
		}

		// Normal agent execution with tools
		const currentMessages = [...input.messages];
		const history: string[] = [];

		for (let iteration = 0; iteration < this.maxIterations; iteration++) {
			const messages = [];

			messages.push({
				role: "developer" as const,
				content: this.createDeveloperPrompt(),
			});

			const memoryMessages = this.memory ? this.memory.getMessages() : [];

			messages.push(
				{ role: "system" as const, content: this.createSystemPrompt() },
				...history.map((h) => ({ role: "assistant" as const, content: h })),
				...memoryMessages,
				...currentMessages.filter(
					(m) => m.role === "user" || m.role === "assistant",
				),
			);

			const response = await this.openai.chat.completions.create({
				model: this.model,
				messages: messages,
			});

			const message = response.choices[0]?.message;

			if (!message?.content) {
				return "No response from model";
			}

			const content = message.content;

			if (this.debug) {
				console.log("\n=== AGENT RESPONSE ===");
				console.log(content);
			}

			// Parse response
			const lines = content.split("\n");
			let actionTool = "";
			let actionInput = "";
			let finalAnswer = "";
			let thought = "";

			for (const line of lines) {
				if (line.startsWith("THOUGHT:")) {
					thought = line.substring(8).trim();
					if (this.debug) {
						console.log(`\n🤔 THOUGHT: ${thought}`);
					}
				} else if (line.startsWith("ACTION:")) {
					const parts = line.substring(7).trim().split(":");
					actionTool = parts[0]?.trim() || "";
					actionInput = parts.slice(1).join(":").trim();
					if (this.debug) {
						console.log(`🔧 ACTION: ${actionTool}`);
						console.log(`📥 INPUT: ${actionInput}`);
					}
				} else if (line.startsWith("FINAL_ANSWER:")) {
					finalAnswer = line.substring(13).trim();
					if (this.debug) {
						console.log(`✅ FINAL_ANSWER: ${finalAnswer}`);
					}
				}
			}

			if (finalAnswer) {
				if (this.memory) {
					this.memory.addMessage({ role: "assistant", content: finalAnswer });
				}
				return finalAnswer;
			}

			if (actionTool && this.tools.has(actionTool)) {
				const tool = this.tools.get(actionTool);
				if (!tool) {
					return `Tool ${actionTool} not found`;
				}

				let inputParams: any;
				try {
					inputParams = JSON.parse(actionInput);
				} catch {
					inputParams = actionInput;
				}

				const validation = tool.inputSchema.safeParse(inputParams);
				let result: any;

				if (validation.success) {
					try {
						result = await tool.execute({ input: validation.data });
					} catch (error) {
						result = `Error executing tool: ${error instanceof Error ? error.message : String(error)}`;
					}
				} else {
					result = `Input validation failed: ${validation.error.message}`;
				}

				const observation = `OBSERVATION: ${typeof result === "string" ? result : JSON.stringify(result)}`;

				if (this.debug) {
					console.log(`👁️  ${observation}`);
				}

				history.push(content);
				history.push(observation);
			} else {
				history.push(content);
			}
		}

		return "Max iterations reached.";
	}
}
