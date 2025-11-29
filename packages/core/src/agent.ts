import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { MemoryInterface } from "./memory";
import type { Message } from "./messages";
import type { ToolInterface } from "./tools";
import type { MCPConfig } from "./mcp";
import { defineMCP } from "./mcp";
import type { z } from "zod";

export interface AgentConfig {
	model?: string;
	apiKey?: string;
	baseURL?: string;
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
		console.log("🚀 Initializing Agent with config:", {
			model: config.model || "gpt-5-mini-2025-08-07",
			maxIterations: config.maxIterations || 10,
			hasInstruction: !!config.instruction,
			hasMemory: !!config.memory,
			debug: process.env.DEBUG === "true" || config.debug || false,
			toolsCount: config.tools?.length || 0,
			hasBaseURL: !!config.baseURL,
		});

		this.model = config.model || "gpt-5-mini-2025-08-07";
		this.maxIterations = config.maxIterations || 10;
		this.instruction = config.instruction;
		this.memory = config.memory;
		this.debug = process.env.DEBUG === "true" || config.debug || false;

		console.log("🔧 Creating OpenAI client...");
		const openaiConfig: any = {
			apiKey: config.apiKey || process.env.OPENAI_API_KEY,
		};

		if (config.baseURL || process.env.OPENAI_BASE_URL) {
			openaiConfig.baseURL = config.baseURL || process.env.OPENAI_BASE_URL;
			console.log("🌐 Using custom base URL:", openaiConfig.baseURL);
		}

		this.openai = new OpenAI(openaiConfig);

		if (config.tools) {
			console.log(`📦 Registering ${config.tools.length} tools...`);
			this.registerTools(config.tools);
		}

		console.log("✅ Agent initialization complete");
	}

	registerTool(tool: ToolInterface): void {
		console.log(`🔨 Registering tool: ${tool.name}`);
		this.tools.set(tool.name, tool);
		console.log(`📋 Total tools registered: ${this.tools.size}`);
	}

	registerTools(tools: ToolInterface[]): void {
		console.log(`📦 Registering ${tools.length} tools in batch...`);
		tools.forEach((tool) => {
			this.registerTool(tool);
		});
		console.log(
			`✅ Batch registration complete. Total tools: ${this.tools.size}`,
		);
	}

	async registerMCP(configs: MCPConfig[]): Promise<void> {
		console.log(`🔌 Registering ${configs.length} MCP servers...`);

		for (const config of configs) {
			console.log(
				`🔌 Processing MCP server: ${config.serverLabel || config.serverUrl}`,
			);
			try {
				const tools = await defineMCP(config);
				this.registerTools(tools);
				console.log(
					`✅ MCP server ${config.serverLabel || config.serverUrl} registered successfully`,
				);
			} catch (error) {
				console.error(
					`❌ Failed to register MCP server ${config.serverLabel || config.serverUrl}:`,
					error,
				);
				throw error;
			}
		}

		console.log(
			`✅ All MCP servers registered. Total tools: ${this.tools.size}`,
		);
	}

	private createSystemPrompt(): string {
		const prompt = this.instruction || "";
		console.log("📝 Creating system prompt:", {
			hasInstruction: !!this.instruction,
			length: prompt.length,
		});
		return prompt;
	}

	private createDeveloperPrompt(): string {
		console.log("🔧 Creating developer prompt...");
		const toolDescriptions = Array.from(this.tools.values())
			.map((tool) => `${tool.name}: ${tool.description}`)
			.join("\n");

		console.log(`📋 Available tools: ${this.tools.size}`);
		console.log("🛠️  Tool descriptions:", toolDescriptions);

		const toolFramework = `You are an AI agent capable of using tools.

Available tools:
${toolDescriptions}

To use a tool, please use the following format:
THOUGHT: <reasoning>
ACTION: <tool_name>:<json_input>

When you have the final answer:
FINAL_ANSWER: <answer>

IMPORTANT CONVERSATION FLOW:
1. You will see OBSERVATION messages containing tool results
2. Use these results to inform your next action
3. Continue with more tools or provide FINAL_ANSWER
4. NEVER repeat or copy OBSERVATION content

Always think step by step.

IMPORTANT: For tool input, use JSON format. For example: ACTION: hello:{"name": "Alice"}`;

		const finalPrompt = this.instruction
			? `${toolFramework}

${this.instruction}`
			: toolFramework;

		console.log("📝 Developer prompt created:", {
			hasCustomInstruction: !!this.instruction,
			totalLength: finalPrompt.length,
		});

		return finalPrompt;
	}

	async run(input: AgentRunInput): Promise<string | any> {
		console.log("🏃 Starting agent run...", {
			messageCount: input.messages.length,
			hasZodSchema: !!input.zodSchema,
			hasMemory: !!this.memory,
			maxIterations: this.maxIterations,
			model: this.model,
		});

		// Add input messages to memory if available
		if (this.memory) {
			console.log("🧠 Adding messages to memory...");
			for (const message of input.messages) {
				console.log(`💾 Adding message to memory: ${message.role}`);
				this.memory.addMessage(message);
			}
		}

		// If structured output is requested, use direct parsing without agent framework
		if (input.zodSchema) {
			console.log("🎯 Using structured output mode with Zod schema");

			const messages = [
				{ role: "system" as const, content: this.createSystemPrompt() },
				...input.messages.filter(
					(m) => m.role === "user" || m.role === "assistant",
				),
			];

			console.log("📨 Sending structured output request to OpenAI...");
			const response = await this.openai.chat.completions.parse({
				model: this.model,
				messages: messages,
				response_format: zodResponseFormat(input.zodSchema, "response"),
			});

			const message = response.choices[0]?.message;
			const parsedMessage = message as any;

			if (parsedMessage?.parsed) {
				const result = parsedMessage.parsed;
				console.log("✅ Structured output parsed successfully:", {
					resultType: typeof result,
					resultKeys: typeof result === "object" ? Object.keys(result) : null,
				});

				if (this.memory) {
					console.log("💾 Adding structured result to memory");
					this.memory.addMessage({
						role: "assistant",
						content: JSON.stringify(result),
					});
				}
				return result;
			} else {
				console.error("❌ Failed to parse structured response");
				return "Failed to parse structured response";
			}
		}

		// Normal agent execution with tools
		console.log("🔄 Starting normal agent execution with tools");
		const currentMessages = [...input.messages];
		const history: string[] = [];

		for (let iteration = 0; iteration < this.maxIterations; iteration++) {
			console.log(`\n📍 Iteration ${iteration + 1}/${this.maxIterations}`);
			const messages = [];

			console.log("📋 Building message array for OpenAI...");
			messages.push({
				role: "developer" as const,
				content: this.createDeveloperPrompt(),
			});

			const memoryMessages = this.memory ? this.memory.getMessages() : [];
			console.log(`🧠 Memory messages count: ${memoryMessages.length}`);

			messages.push(
				{ role: "system" as const, content: this.createSystemPrompt() },
				...history.map((h) => ({ role: "assistant" as const, content: h })),
				...memoryMessages,
				...currentMessages.filter(
					(m) => m.role === "user" || m.role === "assistant",
				),
			);

			console.log("📨 Sending request to OpenAI...", {
				totalMessages: messages.length,
				historyLength: history.length,
				model: this.model,
			});

			const response = await this.openai.chat.completions.create({
				model: this.model,
				messages: messages,
			});

			const message = response.choices[0]?.message;

			if (!message?.content) {
				console.error("❌ No response from model");
				return "No response from model";
			}

			const content = message.content;
			console.log("📥 Received response from OpenAI:", {
				contentLength: content.length,
				hasChoices: response.choices.length > 0,
			});

			if (this.debug) {
				console.log("\n=== AGENT RESPONSE ===");
				console.log(content);
			}

			// Parse response
			console.log("🔍 Parsing agent response...");
			const lines = content.split("\n");
			let actionTool = "";
			let actionInput = "";
			let finalAnswer = "";
			let thought = "";
			console.log(`📝 Response has ${lines.length} lines`);

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
				console.log("🎯 Final answer found, ending execution");
				if (this.memory) {
					console.log("💾 Adding final answer to memory");
					this.memory.addMessage({ role: "assistant", content: finalAnswer });
				}
				return finalAnswer;
			}

			if (actionTool && this.tools.has(actionTool)) {
				console.log(`🔧 Executing tool: ${actionTool}`);
				const tool = this.tools.get(actionTool);
				if (!tool) {
					console.error(`❌ Tool ${actionTool} not found`);
					return `Tool ${actionTool} not found`;
				}

				console.log("📥 Parsing tool input...");
				let inputParams: any;
				try {
					inputParams = JSON.parse(actionInput);
					console.log("✅ Tool input parsed as JSON");
				} catch {
					inputParams = actionInput;
					console.log("⚠️ Tool input treated as raw string");
				}

				console.log("🔍 Validating tool input...");
				const validation = tool.inputSchema.safeParse(inputParams);
				let result: any;

				if (validation.success) {
					console.log("✅ Input validation successful");
					try {
						console.log(`⚡ Executing tool ${actionTool}...`);
						result = await tool.execute({ input: validation.data });
						console.log("✅ Tool execution successful:", {
							resultType: typeof result,
							isString: typeof result === "string",
						});
					} catch (error) {
						console.error("❌ Tool execution failed:", error);
						result = `Error executing tool: ${error instanceof Error ? error.message : String(error)}`;
					}
				} else {
					console.error(
						"❌ Input validation failed:",
						validation.error.message,
					);
					result = `Input validation failed: ${validation.error.message}`;
				}

				const observation = `OBSERVATION: ${typeof result === "string" ? result : JSON.stringify(result)}`;

				if (this.debug) {
					console.log(`👁️  ${observation}`);
				}

				console.log("📚 Adding to history...");
				history.push(content);
				history.push(observation);
				console.log(`📚 History length: ${history.length}`);
			} else {
				if (actionTool) {
					console.warn(`⚠️ Tool ${actionTool} not available`);
				}
				console.log("📚 Adding response to history (no action)");
				history.push(content);
			}
		}

		console.log(`⏰ Max iterations (${this.maxIterations}) reached`);
		return "Max iterations reached.";
	}
}
